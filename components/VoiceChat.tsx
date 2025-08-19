import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { AI_MODEL } from '../lib/constants.ts';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

interface VoiceChatProps {
  onClose?: () => void;
  title?: string;
}

enum ChatState {
  IDLE,
  CONNECTING,
  LISTENING,
  PROCESSING,
  SPEAKING,
  ERROR
}

export const VoiceChat: React.FC<VoiceChatProps> = ({ 
  onClose,
  title = 'Medical History',
}) => {
  const { session } = useAuth();
  const [chatState, setChatState] = useState<ChatState>(ChatState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(title);
  const [isRecording, setIsRecording] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Request microphone permissions
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Microphone access is required');
        setChatState(ChatState.ERROR);
      }
    })();
  }, []);
  
  // Start the pulse animation for the orb
  useEffect(() => {
    if (chatState === ChatState.SPEAKING || chatState === ChatState.LISTENING) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [chatState, pulseAnim]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
      if (recording) {
        stopRecording();
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [ws, recording, sound]);

  // Initialize and connect to OpenAI
  const startVoiceChat = async () => {
    if (!session) {
      setErrorMsg('You must be logged in to use voice chat');
      setChatState(ChatState.ERROR);
      return;
    }

    try {
      setChatState(ChatState.CONNECTING);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Get ephemeral token from Supabase function
      const { data, error } = await supabase.functions.invoke('oai-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error || !data?.client_secret?.value) {
        console.error('Error getting session token:', error || 'No token returned');
        setErrorMsg('Failed to initialize voice chat');
        setChatState(ChatState.ERROR);
        return;
      }

      const ephemeralToken = data.client_secret.value;
      
      // Set up audio recording configuration
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Set up WebSocket connection
      connectWebSocket(ephemeralToken);
      
    } catch (err) {
      console.error('Error starting voice chat:', err);
      setErrorMsg('Failed to initialize voice chat');
      setChatState(ChatState.ERROR);
    }
  };

  const connectWebSocket = (token: string) => {
    const model = AI_MODEL;
    const socket = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${model}`,
      [
        "realtime",
        `openai-insecure-api-key.${token}`, 
        "openai-beta.realtime-v1"
      ]
    );

    socket.onopen = () => {
      console.log("WebSocket connection established");
      setChatState(ChatState.LISTENING);
      setIsRecording(true);
      
      // Send the initial message to start the conversation
      // Using conversation.item.create with the required 'item' parameter
      const initialMessage = {
        type: 'conversation.item.create',
        item: {
          role: 'user',
          content: `You are assisting the user with filling out the "${currentSection}" section of their medical intake form. Ask relevant questions to help gather this information. Be friendly and conversational, and speak briefly.`,
        }
      };
      
      socket.send(JSON.stringify(initialMessage));
      startRecording();
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        if (data.type === 'session.update') {
          if (data.status === 'generating') {
            setChatState(ChatState.SPEAKING);
          } else if (data.status === 'awaiting_input') {
            setChatState(ChatState.LISTENING);
          }
        } else if (data.type === 'response.create') {
          // Response started
          setChatState(ChatState.SPEAKING);
        } else if (data.type === 'response.chunk') {
          // Handle response chunks (transcript)
        } else if (data.type === 'audio.chunk') {
          // Play audio
          await playAudio(data);
        } else if (data.type === 'error') {
          console.error('WebSocket error:', data.error);
          setErrorMsg(data.error.message || 'An error occurred');
          setChatState(ChatState.ERROR);
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setErrorMsg('Connection error');
      setChatState(ChatState.ERROR);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setIsRecording(false);
      stopRecording();
      if (chatState !== ChatState.ERROR) {
        setChatState(ChatState.IDLE);
      }
    };

    setWs(socket);
  };

  const startRecording = async () => {
    try {
      if (recording) {
        await stopRecording();
      }
      
      // Create new recording
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });
      
      await newRecording.startAsync();
      setRecording(newRecording);
      
      // Set up a timer to send audio chunks to the WebSocket
      const audioChunkInterval = setInterval(async () => {
        if (ws && ws.readyState === WebSocket.OPEN && recording && recording.getStatusAsync) {
          try {
            const status = await recording.getStatusAsync();
            if (status.canRecord) {
              await recording.stopAndUnloadAsync();
              const uri = recording.getURI();
              if (!uri) return;
              
              // Get the audio data
              const audioBlob = await fetch(uri).then(response => response.blob());
              const audioArrayBuffer = await audioBlob.arrayBuffer();
              const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
              
              // Send the audio data to the WebSocket using the correct event type
              if (ws.readyState === WebSocket.OPEN) {
                // First append the audio buffer
                ws.send(JSON.stringify({
                  type: 'input_audio_buffer.append',
                  data: audioBase64,
                  encoding: 'base64',
                  format: 'mp4a',
                  sample_rate: 44100
                }));
                
                // Then commit the audio buffer
                ws.send(JSON.stringify({
                  type: 'input_audio_buffer.commit'
                }));
              }
              
              // Start a new recording
              await newRecording.prepareToRecordAsync({
                android: {
                  extension: '.m4a',
                  outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                  audioEncoder: Audio.AndroidAudioEncoder.AAC,
                  sampleRate: 44100,
                  numberOfChannels: 1,
                  bitRate: 128000,
                },
                ios: {
                  extension: '.m4a',
                  audioQuality: Audio.IOSAudioQuality.HIGH,
                  sampleRate: 44100,
                  numberOfChannels: 1,
                  bitRate: 128000,
                  linearPCMBitDepth: 16,
                  linearPCMIsBigEndian: false,
                  linearPCMIsFloat: false,
                },
                web: {
                  mimeType: 'audio/webm',
                  bitsPerSecond: 128000,
                },
              });
              await newRecording.startAsync();
              setRecording(newRecording);
            }
          } catch (err) {
            console.error('Error sending audio chunk:', err);
          }
        } else {
          clearInterval(audioChunkInterval);
        }
      }, 5000); // Send audio every 5 seconds
      
      return () => clearInterval(audioChunkInterval);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setErrorMsg('Failed to access microphone');
      setChatState(ChatState.ERROR);
    }
  };

  const stopRecording = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (err) {
        console.error('Error stopping recording:', err);
      }
      setRecording(null);
    }
  };

  const playAudio = async (audioData: any) => {
    try {
      // If there's a sound playing, stop it
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      
      // Convert base64 to a local URI
      const base64Data = audioData.data;
      const fileName = `${Date.now()}.mp3`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Create a file with the audio data
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Create a new sound and play it
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      
      // Clean up when done playing
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          newSound.unloadAsync();
          FileSystem.deleteAsync(fileUri, { idempotent: true });
        }
      });
    } catch (err) {
      console.error('Error playing audio:', err);
    }
  };

  const pauseChat = () => {
    setIsRecording(false);
    stopRecording();
    if (ws) {
      // Clear the audio buffer instead of audio_end
      ws.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
    }
    setChatState(ChatState.IDLE);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const resumeChat = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      setIsRecording(true);
      setChatState(ChatState.LISTENING);
      startRecording();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      startVoiceChat();
    }
  };

  const handleClose = () => {
    if (ws) {
      ws.close();
    }
    stopRecording();
    if (sound) {
      sound.unloadAsync();
    }
    if (onClose) {
      onClose();
    }
  };

  // Render different button states
  const renderButton = () => {
    if (chatState === ChatState.IDLE) {
      return (
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={startVoiceChat}
        >
          <View style={styles.playButton} />
        </TouchableOpacity>
      );
    } else if (chatState === ChatState.CONNECTING) {
      return (
        <TouchableOpacity style={styles.controlButton}>
          <ActivityIndicator color="#fff" size="small" />
        </TouchableOpacity>
      );
    } else if (chatState === ChatState.LISTENING || chatState === ChatState.SPEAKING) {
      return (
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={pauseChat}
        >
          <View style={styles.pauseContainer}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={startVoiceChat}
        >
          <View style={styles.refreshButton}>
            <Text style={styles.refreshIcon}>↻</Text>
          </View>
        </TouchableOpacity>
      );
    }
  };

  // Get status text based on chat state
  const getStatusText = () => {
    switch (chatState) {
      case ChatState.IDLE:
        return 'Press to start';
      case ChatState.CONNECTING:
        return 'Connecting...';
      case ChatState.LISTENING:
        return 'Listening...';
      case ChatState.PROCESSING:
        return 'Processing...';
      case ChatState.SPEAKING:
        return 'Speaking...';
      case ChatState.ERROR:
        return errorMsg || 'Error occurred';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
      
      <Text style={styles.headerText}>Now filling:</Text>
      <BlurView intensity={10} style={styles.sectionContainer}>
        <Text style={styles.sectionText}>{currentSection}</Text>
      </BlurView>
      
      <Animated.View 
        style={[
          styles.orbContainer, 
          { 
            transform: [{ scale: pulseAnim }],
            backgroundColor: chatState === ChatState.SPEAKING ? '#5B87FF' : 
                            chatState === ChatState.LISTENING ? '#5B87FF' : 
                            chatState === ChatState.ERROR ? '#FF5B5B' : '#5B87FF',
          }
        ]}
      />
      
      <View style={styles.controlsContainer}>
        {renderButton()}
      </View>
      
      <Text style={styles.statusText}>{getStatusText()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 10,
  },
  sectionContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  orbContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#5B87FF',
    marginVertical: 40,
    opacity: 0.8,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(180, 180, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 20,
    borderRightWidth: 0,
    borderBottomWidth: 15,
    borderTopWidth: 15,
    borderLeftColor: '#FFFFFF',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
    marginLeft: 5,
  },
  pauseContainer: {
    flexDirection: 'row',
    width: 20,
    justifyContent: 'space-between',
  },
  pauseBar: {
    width: 7,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  refreshButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 20,
    position: 'absolute',
    bottom: 50,
  },
});
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Button, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../../lib/supabase.js';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FormField } from '../services/FormProcessingService.js';
import { StorageService } from '../services/StorageService.js';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

export default function VoiceChatScreen() {
  const router = useRouter();
  const { formFields: formFieldsString } = useLocalSearchParams<{ formFields: string }>();

  const [fields, setFields] = useState<FormField[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingStatus, setRecordingStatus] = useState('idle'); // 'idle', 'recording', 'stopped'
    const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
    const [playbackObject, setPlaybackObject] = useState<Audio.Sound | null>(null);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isFormComplete, setIsFormComplete] = useState(false);

  useEffect(() => {
    if (formFieldsString) {
      try {
        const parsedFields: FormField[] = JSON.parse(formFieldsString);
        setFields(parsedFields);
        // Initial bot message
                if (parsedFields.length > 0) {
                              const initialFormData = parsedFields.reduce((acc, field) => {
            acc[field.fieldName] = '';
            return acc;
          }, {} as Record<string, string>);
          setFormData(initialFormData);

          const initialMessage = `Hello! I'm here to help you fill out the form. Let's start with the first field: ${parsedFields[0]?.label}`;
          playAndHandleBotResponse(initialMessage);
        }
      } catch (error) {
        console.error('Failed to parse form fields:', error);
        setMessages([
          {
            id: '1',
            text: 'Sorry, there was an error loading the form. Please try again.',
            sender: 'bot',
          },
        ]);
      }
    }
      (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setAudioPermission(status === 'granted');
    })();
  }, [formFieldsString]);

    async function startRecording() {
    try {
      if (audioPermission) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
      setRecordingStatus('recording');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;

    setRecordingStatus('stopped');
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (!uri) {
      console.error('Recording URI is null');
      setRecording(null);
      return;
    }

    console.log('Recording stopped and stored at', uri);

    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        console.error('File does not exist at URI:', uri);
        return;
      }

      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const audioUri = `data:audio/m4a;base64,${audioBase64}`;

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audioUri },
      });

      if (error) {
        throw error;
      }

            if (data.transcription) {
        const userResponse = data.transcription;
        const newMessage: Message = { id: Date.now().toString(), text: userResponse, sender: 'user' };
        setMessages(prev => [...prev, newMessage]);

        // Save the response
                const currentField = fields[currentFieldIndex];
        const newFormData = { ...formData, [currentField.fieldName]: userResponse };
        setFormData(newFormData);

        // Move to the next field
        const nextIndex = currentFieldIndex + 1;
        setCurrentFieldIndex(nextIndex);

        if (nextIndex < fields.length) {
          // Ask the next question
          const nextField = fields[nextIndex];
          playAndHandleBotResponse(`Great. Now, what is the ${nextField.label}?`);
        } else {
          // Form is complete
          playAndHandleBotResponse('Awesome, the form is complete! Please review and save.');
          setIsFormComplete(true);
        }
      }

    } catch (err) {
      console.error('Error sending audio for transcription', err);
    } finally {
      setRecording(null);
    }
  }

    async function playAndHandleBotResponse(text: string) {
    const newMessage: Message = { id: Date.now().toString() + 'b', text, sender: 'bot' };
    setMessages(prev => [...prev, newMessage]);

    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text },
      });

      if (error) throw error;

      if (data.audioBase64) {
        if (playbackObject) {
          await playbackObject.unloadAsync();
        }

        const uri = FileSystem.cacheDirectory + 'bot-response.mp3';
        await FileSystem.writeAsStringAsync(uri, data.audioBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { sound } = await Audio.Sound.createAsync({ uri });
        setPlaybackObject(sound);
        await sound.playAsync();
      }
    } catch (err) {
      console.error('Error generating or playing speech', err);
    }
  }

  const handleSendMessage = () => {
    if (currentMessage.trim() === '') return;

        const userResponse = currentMessage;
    const newMessage: Message = { id: Date.now().toString(), text: userResponse, sender: 'user' };
    setMessages(prev => [...prev, newMessage]);
    setCurrentMessage('');

    // Save the response
    const currentField = fields[currentFieldIndex];
    const newFormData = { ...formData, [currentField.fieldName]: userResponse };
    setFormData(newFormData);

    // Move to the next field
    const nextIndex = currentFieldIndex + 1;
    setCurrentFieldIndex(nextIndex);

    if (nextIndex < fields.length) {
      // Ask the next question
      const nextField = fields[nextIndex];
      playAndHandleBotResponse(`Great. Now, what is the ${nextField.label}?`);
    } else {
      // Form is complete
      playAndHandleBotResponse('Awesome, the form is complete! Please review and save.');
      setIsFormComplete(true);
    }
  };

    const handleSaveForm = async () => {
    try {
      await StorageService.saveForm(formData);
      console.log('Form saved successfully!');
      // Optionally, show an alert to the user
      router.push('/'); // Navigate home
    } catch (error) {
      console.error('Failed to save form:', error);
      // Optionally, show an error alert to the user
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Text style={styles.title}>Fill Form by Voice</Text>
      <ScrollView style={styles.messagesContainer}>
        {messages.map((msg: Message) => (
          <View
            key={msg.id}
            style={[styles.messageBubble, msg.sender === 'user' ? styles.userMessage : styles.botMessage]}
          >
            <Text style={msg.sender === 'user' ? styles.userMessageText : styles.botMessageText}>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={currentMessage}
          onChangeText={setCurrentMessage}
          placeholder="Type your answer..."
        />
                <Button title="Send" onPress={handleSendMessage} />
        <TouchableOpacity style={styles.micButton} onPress={recordingStatus === 'recording' ? stopRecording : startRecording}>
          <Text style={styles.micText}>{recordingStatus === 'recording' ? 'Stop' : 'Record'}</Text>
        </TouchableOpacity>
      </View>
            {isFormComplete && <Button title="Save Form" onPress={handleSaveForm} />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
    marginBottom: 10,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  botMessage: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
  },
  userMessageText: {
    fontSize: 16,
    color: '#fff',
  },
  botMessageText: {
    fontSize: 16,
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  micButton: {
    backgroundColor: '#007AFF',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micText: {
    color: '#fff',
    fontSize: 16,
  },
});
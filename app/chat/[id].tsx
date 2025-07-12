import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startDocumentChat, sendMessage, ChatSession, Message } from '../../lib/chat.service.ts';
import { getDocumentById } from '../../lib/documents.service.ts';

export default function ChatScreen() {
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; isNew?: string; documentId?: string }>();
  
  useEffect(() => {
    loadChat();
  }, []);

  const loadChat = async () => {
    try {
      setIsLoading(true);
      
      // Check if we need to create a new chat or load existing one
      if (params.isNew === 'true') {
        // This is a new chat, get chat session from AsyncStorage or create one
        try {
          const storedSessionStr = await AsyncStorage.getItem(`chat_${params.id}`);
          if (storedSessionStr) {
            setChatSession(JSON.parse(storedSessionStr));
          } else {
            // Create new chat with document if document_id is in the chat session
            const existingChat = await startDocumentChat();
            setChatSession(existingChat);
            // Save to AsyncStorage
            await AsyncStorage.setItem(`chat_${params.id}`, JSON.stringify(existingChat));
          }
        } catch (storageError) {
          console.error('AsyncStorage error:', storageError);
          // Fallback to creating a new chat
          const newChat = await startDocumentChat();
          setChatSession(newChat);
        }
      } else {
        // Load existing chat from AsyncStorage
        try {
          const storedSessionStr = await AsyncStorage.getItem(`chat_${params.id}`);
          if (storedSessionStr) {
            setChatSession(JSON.parse(storedSessionStr));
          } else {
            // If chat doesn't exist in AsyncStorage but has a document, load document and start chat
            if (params.documentId) {
              const document = await getDocumentById(params.documentId);
              if (document) {
                const newChat = await startDocumentChat(document);
                setChatSession(newChat);
                // Save to AsyncStorage
                await AsyncStorage.setItem(`chat_${params.id}`, JSON.stringify(newChat));
              }
            } else {
              // Create empty chat
              const newChat = await startDocumentChat();
              setChatSession(newChat);
              // Save to AsyncStorage
              await AsyncStorage.setItem(`chat_${params.id}`, JSON.stringify(newChat));
            }
          }
        } catch (storageError) {
          console.error('AsyncStorage error:', storageError);
          // Fallback to creating a new chat
          const newChat = await startDocumentChat();
          setChatSession(newChat);
        }
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const message = inputMessage.trim();
 
    if (!message || !chatSession) return;

    setInputMessage(''); // Clear input only if a message is sent

    try {
      setIsSending(true);

      // Update UI immediately with user message
      const updatedSession = {
        ...chatSession,
        messages: [
          ...chatSession.messages,
          { role: 'user', content: message } as Message
        ]
      };
      setChatSession(updatedSession);

      // Send message to OpenAI
      const responseSession = await sendMessage(chatSession, message);

      // Update chat session with response
      setChatSession(responseSession);

      // Save updated chat to AsyncStorage
      try {
        await AsyncStorage.setItem(`chat_${params.id}`, JSON.stringify(responseSession));
      } catch (storageError) {
        console.error('Error saving chat to AsyncStorage:', storageError);
      }

      // Scroll to bottom
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Render message item
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage]}>
        <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
          {typeof item.content === 'string' ? item.content : 'Content includes images (not displayed in chat view)'}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#636ae8" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: chatSession?.title || 'Chat',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          ),
        }} 
      />
      <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0} // Adjust 80 as needed
      >
        {chatSession ? (
          <>
            <FlatList
              ref={listRef}
              data={chatSession.messages.filter(msg => msg.role !== 'system')}
              keyExtractor={(_, index) => index.toString()}
              renderItem={renderMessageItem}
              contentContainerStyle={styles.chatList}
              onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
            />
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputMessage}
                onChangeText={setInputMessage}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                multiline
                keyboardType="default" // Ensures standard text keyboard
                returnKeyType="send"
                blurOnSubmit={false}
                editable={!isSending}
                onSubmitEditing={handleSendMessage}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                    handleSendMessage();
                  }
                }}
              />
              
              <TouchableOpacity
                style={[styles.sendButton, (!inputMessage.trim() || isSending) && styles.disabledButton]}
                onPress={handleSendMessage}
                disabled={!inputMessage.trim() || isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="send" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load chat</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadChat}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  chatList: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  messageContainer: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#636ae8',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f5',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#636ae8',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ff6b6b',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#636ae8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});
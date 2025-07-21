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
import { supabase } from '../../lib/supabaseClient.ts';
import { getDocumentById } from '../../lib/documents.service.ts';
import { sendMessage, ChatSession, Message } from '../../lib/chat.service.ts';

export default function ChatScreen() {
  const [chatSession, setChatSession] = useState<{ id: string; title: string; messages: any[] } | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; isNew?: string; documentId?: string }>();

  useEffect(() => {
    const fetchUserId = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id ?? null);
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (currentUserId) loadChat();
  }, [currentUserId]);

  // Load chat and messages from Supabase
  const loadChat = async () => {
    setIsLoading(true);
    try {
      // Try to find existing chat by ID from params
      const { data: existingChat, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', currentUserId)
        .single();

      if (chatError && chatError.code !== 'PGRST116') {
        console.error('Error loading chat:', chatError);
        throw chatError;
      }

      let chat = existingChat;

      // If chat doesn't exist and we have a documentId, try to find or create chat for that document
      if (!chat && params.documentId) {
        const { data: documentChat, error: docChatError } = await supabase
          .from('chats')
          .select('*')
          .eq('user_id', currentUserId)
          .eq('document_id', params.documentId)
          .limit(1)
          .maybeSingle();

        if (docChatError) {
          console.error('Error finding document chat:', docChatError);
        } else if (documentChat) {
          chat = documentChat;
        }
      }

      // If still no chat, create a new one
      if (!chat) {
        let chatTitle = 'New Chat';
        if (params.documentId) {
          const document = await getDocumentById(params.documentId);
          if (document && document.name) {
            chatTitle = document.name;
          }
        }

        const { data: newChat, error: createError } = await supabase
          .from('chats')
          .insert([{ 
            user_id: currentUserId, 
            title: chatTitle, 
            document_id: params.documentId || null
          }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating chat:', createError);
          throw createError;
        }

        chat = newChat;

        // Add intro message for new chats
        const introMessage = {
          chat_id: chat.id,
          user_id: currentUserId,
          content: { type: 'text', text: "👋 I am your AI assistant. Ask me anything!" },
          role: 'assistant'
        };
        
        const { error: msgError } = await supabase
          .from('messages')
          .insert([introMessage]);

        if (msgError) {
          console.error('Error creating intro message:', msgError);
        }
      }

      // Load messages for the chat
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('Error loading messages:', msgError);
      }

      setChatSession({
        id: chat.id,
        title: chat.title,
        messages: messages ? messages.map(msg => ({ 
          ...msg.content, 
          role: msg.role,
          id: msg.id
        })) : [],
      });
        
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save message to Supabase and get LLM response
  const handleSendMessage = async () => {
    const message = inputMessage.trim();
    if (!message || !chatSession || !currentUserId) return;
    
    setInputMessage('');
    setIsSending(true);
    
    // Create the new user message object
    const newUserMessage = { type: 'text', text: message, role: 'user' };
    
    // Optimistically update UI with user message
    setChatSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, newUserMessage],
    } : prev);

    try {
      // Save user message to database
      const { error: userMsgError } = await supabase.from('messages').insert([
        {
          chat_id: chatSession.id,
          user_id: currentUserId,
          content: { type: 'text', text: message },
          role: 'user',
        }
      ]);

      if (userMsgError) {
        console.error('Error saving user message:', userMsgError);
        // Rollback optimistic update
        setChatSession(prev => prev ? {
          ...prev,
          messages: prev.messages.filter((msg, idx, arr) => idx !== arr.length - 1),
        } : prev);
        return;
      }

      // Prepare chat session for LLM call
      const chatForLLM: ChatSession = {
        id: chatSession.id,
        title: chatSession.title,
        messages: [...chatSession.messages, newUserMessage].map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.text || msg.content || ''
        })),
        documentId: params.documentId
      };

      // Get LLM response
      const updatedChatSession = await sendMessage(chatForLLM, message);
      
      // Extract the assistant's response (last message)
      const assistantMessage = updatedChatSession.messages[updatedChatSession.messages.length - 1];
      
      if (assistantMessage && assistantMessage.role === 'assistant') {
        // Add assistant message to UI
        const assistantUIMessage = { 
          type: 'text', 
          text: assistantMessage.content as string, 
          role: 'assistant' 
        };
        
        setChatSession(prev => prev ? {
          ...prev,
          messages: [...prev.messages, assistantUIMessage],
        } : prev);

        // Save assistant message to database
        const { error: assistantMsgError } = await supabase.from('messages').insert([
          {
            chat_id: chatSession.id,
            user_id: currentUserId,
            content: { type: 'text', text: assistantMessage.content as string },
            role: 'assistant',
          }
        ]);

        if (assistantMsgError) {
          console.error('Error saving assistant message:', assistantMsgError);
        }
      }

    } catch (error) {
      console.error('Error in message handling:', error);
      
      // Add error message to chat
      const errorMessage = { 
        type: 'text', 
        text: 'I apologize, but I encountered an error processing your request. Please try again.', 
        role: 'assistant' 
      };
      
      setChatSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, errorMessage],
      } : prev);
      
    } finally {
      setIsSending(false);
    }
  };

  // Render message item
  const renderMessageItem = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    let messageText = '';
    
    // Handle different message content formats
    if (typeof item.text === 'string') {
      messageText = item.text;
    } else if (typeof item.content === 'string') {
      messageText = item.content;
    } else if (item.content && typeof item.content === 'object' && item.content.text) {
      messageText = item.content.text;
    } else if (item.type === 'text' && item.text) {
      messageText = item.text;
    }
    
    if (!messageText) return null;
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage]}>
        <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
          {messageText}
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          {chatSession ? (
            <>
              <FlatList
                ref={listRef}
                data={chatSession.messages}
                keyExtractor={(item, index) => item.id ? item.id.toString() : `msg-${index}`}
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
                  keyboardType="default"
                  returnKeyType="send"
                  blurOnSubmit={false}
                  editable={!isSending}
                  onSubmitEditing={handleSendMessage}
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
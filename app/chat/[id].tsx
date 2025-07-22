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
import { sendMessage } from '@/lib/chat.service.ts';

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
    let chat;
    try {

      const { data: existingChats, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('documentId', params.documentId)
        .limit(1)
        .maybeSingle();

      if (existingChats) {
        chat = existingChats;
      }
      if(chat){
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
          messages: messages ? messages.map(msg => ({ ...msg.content, role: msg.role })) : [],
        });
        
      } else {
        let chatTitle = 'New Chat';
        if (params.documentId) {
          const document = await getDocumentById(params.documentId);
          if (document && document.name) {
            chatTitle = document.name; // Use the document's name as the chat title
          }
        }

        // Create chat
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .insert([{ user_id: currentUserId, title: chatTitle, documentId: params.documentId }])
          .select()
          .single();

        if (chatError || !chat) {
          console.error('Error creating chat:', chatError);
          setIsLoading(false);
          return;
        }

        // Add intro message
        const introMessage = {
          chat_id: chat.id,
          user_id: currentUserId,
          content: "👋 I am your AI assistant. Ask me anything about your document!",
          role: 'assistant'
        };
        await supabase.from('messages').insert([introMessage]);

        setChatSession({
          id: chat.id,
          title: chat.title,
          messages: [{ role: 'assistant', content: introMessage.content }],
        });
      }  
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save message to Supabase
  const handleSendMessage = async () => {
    const message = inputMessage.trim();
    if (!message || !chatSession || !currentUserId) return;
    setInputMessage('');
    setIsSending(true);
    // Create the new message object
    const newMessage = { content: message, role: 'user' };
    // Optimistically update UI
    setChatSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, newMessage],
    } : prev);
    let userMessageId = null;
    try {
      // Save user message to database
      const { data: userMsgData, error: userMsgError } = await supabase.from('messages').insert([
        {
          chat_id: chatSession.id,
          user_id: currentUserId,
          content: message,
          role: 'user',
        }
      ]).select().single();
      if (userMsgError) {
        // Rollback optimistic update if error
        setChatSession(prev => prev ? {
          ...prev,
          messages: prev.messages.filter((msg, idx, arr) => idx !== arr.length - 1),
        } : prev);
        console.error('Error sending message:', userMsgError);
        setIsSending(false);
        return;
      }
      userMessageId = userMsgData?.id;
      // Get assistant response from OpenAI via Supabase
      const updatedSession = await sendMessage(chatSession, message);
      // Find the assistant's message (last in updatedSession.messages)
      const assistantMsg = updatedSession.messages[updatedSession.messages.length - 1];
      // Update UI with assistant message
      setChatSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMsg],
      } : prev);
      // Save assistant message to database
      await supabase.from('messages').insert([
        {
          chat_id: chatSession.id,
          user_id: null, // or system/assistant id if you have one
          content: assistantMsg.content,
          role: 'assistant',
        }
      ]);
    } catch (error) {
      // Rollback optimistic update if error
      setChatSession(prev => prev ? {
        ...prev,
        messages: prev.messages.filter((msg, idx, arr) => idx !== arr.length - 1),
      } : prev);
      console.error('Error sending message or getting assistant response:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Render message item
  const renderMessageItem = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    let messageText = '';

    if (typeof item.content === 'string') {
      messageText = item.content;
    } else if (Array.isArray(item.content)) {
      // If content is an array (OpenAI format), find the first text part
      const textPart = item.content.find((c: any) => c.type === 'text');
      if (textPart) messageText = textPart.text;
    } else if (item.content && item.content.type === 'text') {
      messageText = item.content.text;
    }

    if (messageText === '') return null;

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
                  keyboardType="default"
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
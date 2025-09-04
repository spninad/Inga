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
  SafeAreaView,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabaseClient';
import { getDocumentById, Document } from '../../lib/documents.service';
import { sendMessage } from '@/lib/chat.service';
import { v4 as uuidv4 } from 'uuid';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function ChatScreen() {
  const [chatSession, setChatSession] = useState<{ id: string; title: string; messages: any[] } | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [loadingDots, setLoadingDots] = useState('');
  const listRef = useRef<FlatList>(null);
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; isNew?: string; documentId?: string }>();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const inputBackgroundColor = useThemeColor({}, 'inputBackground');
  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const headerTintColor = useThemeColor({}, 'headerTint');
  // Additional theme colors used in nested renders
  const cardSecondaryColor = useThemeColor({}, 'cardSecondary');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textPlaceholderColor = useThemeColor({}, 'textPlaceholder');

  // Predefined list of languages
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski' },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
    { code: 'da', name: 'Danish', nativeName: 'Dansk' },
    { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
    { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  ];

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

  // Animate loading dots
  useEffect(() => {
    if (isSending) {
      const interval = setInterval(() => {
        setLoadingDots(prev => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setLoadingDots('');
    }
  }, [isSending]);

  // Load chat and messages from Supabase
  const loadChat = async () => {
    setIsLoading(true);
    let chat;
    try {

      console.log("Looking for chat with user:", currentUserId, "doc:", params.documentId);

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
          messages: messages ? messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content
          })):[],
        });
        
      } else {
        const now = new Date();
        const isoNow = now.toISOString();

        let chatTitle = 'General Chat';
        let chatDocumentId: string | null = null;
        if (params.documentId) {
          const document = await getDocumentById(params.documentId, currentUserId!);
          if (document && document.name) {
            chatTitle = document.name; // Use the document's name as the chat title
            chatDocumentId = params.documentId;
          }
        }
        // For general chats, chatDocumentId remains null - no fake document creation

        // Create chat
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .insert([{ user_id: currentUserId, title: chatTitle, documentId: chatDocumentId, created_at: isoNow }])
          .select()
          .single();

        if (chatError || !chat) {
          console.error('Error creating chat:', chatError);
          setIsLoading(false);
          return;
        }

        // Add intro message with language selection
        const introMessage = {
          chat_id: chat.id,
          user_id: currentUserId,
          content: "👋 I am your AI assistant. Please select your preferred language to continue our conversation about your document.",
          role: 'assistant'
        };
        await supabase.from('messages').insert([introMessage]);

        setChatSession({
          id: chat.id,
          title: chat.title,
          messages: [{ role: 'assistant', content: introMessage.content }],
        });
        
        // Show language selection modal for new chats
        setShowLanguageModal(true);
      }  
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle language selection
  const handleLanguageSelect = async (language: { code: string; name: string; nativeName: string }) => {
    if (!chatSession || !currentUserId) return;
    
    setSelectedLanguage(language.name);
    setShowLanguageModal(false);
    setIsSending(true); // Start loading animation
    
    // Send the language selection as a user message
    const languageMessage = `I prefer to converse in ${language.name} (${language.nativeName}).`;
    
    // Create the new message object
    const newMessage = { content: languageMessage, role: 'user' };
    
    // Optimistically update UI
    setChatSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, newMessage],
    } : prev);
    
    // Scroll to bottom after adding user message
    setTimeout(() => scrollToBottom(), 100);
    
    try {
      // Save user message to database
      const { data: userMsgData, error: userMsgError } = await supabase.from('messages').insert([
        {
          chat_id: chatSession.id,
          user_id: currentUserId,
          content: languageMessage,
          role: 'user',
        }
      ]).select().single();
      
      if (userMsgError) {
        // Rollback optimistic update if error
        setChatSession(prev => prev ? {
          ...prev,
          messages: prev.messages.filter((msg, idx, arr) => idx !== arr.length - 1),
        } : prev);
        console.error('Error sending language message:', userMsgError);
        return;
      }
      
      // Fetch the document and send it with the language message
      let document: Document | undefined = undefined;
      if (params.documentId && currentUserId) {
        const docResult = await getDocumentById(params.documentId, currentUserId);
        if (docResult) document = docResult;
      }
      
      // Get assistant response from OpenAI via Supabase
      const updatedSession = await sendMessage(chatSession, languageMessage, document);

      console.log(updatedSession);
      
      // Find the assistant's message (last in updatedSession.messages)
      const assistantMsg = updatedSession.messages[updatedSession.messages.length - 1];
      
      // Update UI with assistant message
      setChatSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMsg],
      } : prev);
      
      // Scroll to bottom after adding assistant message
      setTimeout(() => scrollToBottom(), 100);
      
      // Save assistant message to database
      const { data: assistantMsgData, error: assistantMsgError } = await supabase.from('messages').insert([
        {
          chat_id: chatSession.id,
          user_id: currentUserId,
          content: assistantMsg.content,
          role: 'assistant',
        }
      ]).select().single();

      if(assistantMsgError){
        console.log("error: ", assistantMsgError);
      }
    } catch (error) {
      // Rollback optimistic update if error
      setChatSession(prev => prev ? {
        ...prev,
        messages: prev.messages.filter((msg, idx, arr) => idx !== arr.length - 1),
      } : prev);
      console.error('Error sending language message or getting assistant response:', error);
    } finally {
      setIsSending(false); // Stop loading animation
    }
  };

  // Save message to Supabase
  const handleSendMessage = async () => {
    const message = inputMessage.trim();
    if (!message || !chatSession || !currentUserId) return;
    
    // Clear input immediately to prevent double sending
    setInputMessage('');
    setIsSending(true);
    // Create the new message object
    const newMessage = { content: message, role: 'user' };
    // Optimistically update UI
    setChatSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, newMessage],
    } : prev);
    
    // Scroll to bottom after adding user message
    setTimeout(() => scrollToBottom(), 100);
    
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
      // Fetch the document and send it with every message
      let document: Document | undefined = undefined;
      if (params.documentId && currentUserId) {
        const docResult = await getDocumentById(params.documentId, currentUserId);
        if (docResult) document = docResult;
      }
      // Get assistant response from OpenAI via Supabase, always passing the document (or undefined)
      const updatedSession = await sendMessage(chatSession, message, document);
      // Find the assistant's message (last in updatedSession.messages)
      const assistantMsg = updatedSession.messages[updatedSession.messages.length - 1];
      // Update UI with assistant message
      setChatSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMsg],
      } : prev);
      
      // Scroll to bottom after adding assistant message
      setTimeout(() => scrollToBottom(), 100);
      
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

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (listRef.current && chatSession?.messages.length) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Render message item
  const renderMessageItem = ({ item, index }: { item: any; index: number }) => {
    const isUser = item.role === 'user';
    let messageText = '';

    // Handle loading message
    if (item.id === 'loading') {
      return (
        <View style={[styles.messageContainer, styles.aiMessage, { backgroundColor: cardSecondaryColor }]}>
          <Text style={[styles.messageText, styles.aiMessageText, { color: textColor }]}>
            <Text style={[styles.loadingDots, { color: primaryColor }]}>{loadingDots}</Text>
          </Text>
        </View>
      );
    }

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
      <View
        style={[
          styles.messageContainer,
          isUser
            ? [styles.userMessage, { backgroundColor: primaryColor }]
            : [styles.aiMessage, { backgroundColor: cardSecondaryColor }],
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userMessageText : [styles.aiMessageText, { color: textColor }],
          ]}
        >
          {messageText}
        </Text>
      </View>
    );
  };

  // Create messages array with loading message if sending
  const messagesWithLoading = isSending 
    ? [...(chatSession?.messages || []), { role: 'assistant', content: '', id: 'loading' }]
    : chatSession?.messages || [];

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: chatSession?.title || 'Chat',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={headerTintColor} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          {chatSession ? (
            <>
              <FlatList
                ref={listRef}
                data={messagesWithLoading}
                keyExtractor={(item, index) => item.id || index.toString()}
                renderItem={renderMessageItem}
                contentContainerStyle={styles.chatList}
                onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              />
              <View style={[styles.inputContainer, { borderTopColor: borderColor, backgroundColor }]}>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBackgroundColor, color: textColor }]}
                  value={inputMessage}
                  onChangeText={setInputMessage}
                  placeholder="Type a message..."
                  placeholderTextColor={textPlaceholderColor}
                  multiline
                  keyboardType="default"
                  returnKeyType="send"
                  blurOnSubmit={false}
                  editable={!isSending}
                  onSubmitEditing={handleSendMessage}
                  // onKeyPress is unreliable for modifier keys on RN; rely on onSubmitEditing or Send button
                />
                <TouchableOpacity
                  style={[styles.sendButton, { backgroundColor: primaryColor }, (!inputMessage.trim() || isSending) && styles.disabledButton]}
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
            <ThemedView style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>Failed to load chat</ThemedText>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: primaryColor }]}
                onPress={loadChat}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </ThemedView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardColor }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <ThemedText style={styles.modalTitle}>Select Your Language</ThemedText>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.languageList}>
              {languages.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[styles.languageItem, { borderBottomColor: borderColor }]}
                  onPress={() => handleLanguageSelect(language)}
                >
                  <ThemedText style={styles.languageName}>{language.name}</ThemedText>
                  <ThemedText style={[styles.languageNativeName, { color: textSecondaryColor }]}>{language.nativeName}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    alignSelf: 'flex-start',
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
    // Color will be set dynamically
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  languageList: {
    maxHeight: 400,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
  },
  languageNativeName: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  loadingDots: {
    fontWeight: 'bold',
  },
});
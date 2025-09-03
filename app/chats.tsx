import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { startDocumentChat } from '../lib/chat.service.ts';
import { supabase } from '../lib/supabaseClient.ts';
import { useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';

// Interface for Chat type
interface Chat {
  id: string;
  title: string;
  created_at: string;
  documentId?: string;
  user_id: string;
}

export default function ChatsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useFocusEffect(
    useCallback(() => {
      getUserAndFetchChats();

      const subscription = supabase
        .channel('chats-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chats' },
          (payload) => {
            const newChat = payload.new as Chat;
            setChats((prev) => [newChat, ...prev]);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chats' },
          (payload) => {
            const updatedChat = payload.new as Chat;
            setChats((prev) =>
              prev.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat))
            );
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'chats' },
          (payload) => {
            const deletedChat = payload.old as Chat;
            setChats((prev) => prev.filter((chat) => chat.id !== deletedChat.id));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }, [])
  );


  const getUserAndFetchChats = async () => {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // User not authenticated
        Alert.alert('Authentication Required', 'Please sign in to view your chats');
        router.replace('/auth/login'); // Assuming you have a login screen
        return;
      }
      
      // Store user ID for later use
      setUserId(session.user.id);
      
      // Now fetch chats for this user
      await fetchChats(session.user.id);
    } catch (error) {
      console.error('Error getting authentication:', error);
      setIsLoading(false);
    }
  };

  const fetchChats = async (uid: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setChats(data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
      Alert.alert('Error', 'Failed to load your chats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    if (!userId) {
      Alert.alert('Authentication Required', 'Please sign in to create a chat');
      return;
    }
    
    // Create a new empty chat
    const newChat = await startDocumentChat();
    
    // Navigate to the chat screen
    router.push({
      pathname: '/chat/[id]',
      params: { id: newChat.id, isNew: 'true', documentId: newChat.documentId }
    });
  };

  const handleChatPress = (chatId: string, documentId: string) => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: chatId , documentId: documentId}
    });
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  // Display authentication required message if not logged in
  if (!userId) {
    return (
      <ThemedView style={styles.authRequiredContainer}>
        <Ionicons name="lock-closed" size={64} color={colors.textTertiary} />
        <ThemedText style={styles.authRequiredText}>Authentication Required</ThemedText>
        <ThemedText style={styles.authRequiredSubText}>
          Please sign in to view and manage your chats
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Chats',
          headerLargeTitle: true,
        }}
      />
      
      <ThemedView style={styles.container}>
        {/* Remove the title text since it will be in the header */}
        
        <TouchableOpacity style={[styles.newChatButton, { backgroundColor: colors.primary }]} onPress={handleNewChat}>
          <Ionicons name="add-circle" size={24} color="white" />
          <ThemedText style={styles.newChatButtonText}>New Chat</ThemedText>
        </TouchableOpacity>
        
        {chats.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.textTertiary} />
            <ThemedText style={styles.emptyStateText}>No chats yet</ThemedText>
            <ThemedText style={styles.emptyStateSubText}>
              Start a new chat or create one from a document
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ThemedCard style={styles.chatItem}>
                <TouchableOpacity
                  style={styles.chatContent}
                  onPress={() => {
                    console.log("Pressed chat:", item.id);
                    handleChatPress(item.id, item.documentId || "");}}
                >
                  <View style={[styles.chatIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons 
                      name={item.documentId ? "document-text" : "chatbubble-ellipses"} 
                      size={32} 
                      color={colors.primary} 
                    />
                  </View>
                  <View style={styles.chatInfo}>
                    <ThemedText style={styles.chatTitle}>{item.title}</ThemedText>
                    <ThemedText style={styles.chatTimestamp}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </ThemedCard>
            )}
            style={styles.chatsList}
            contentContainerStyle={styles.chatsListContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  newChatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  chatsList: {
    flex: 1,
  },
  chatsListContent: {
    paddingBottom: 20,
  },
  chatItem: {
    marginBottom: 10,
  },
  chatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  chatIcon: {
    width: 50,
    height: 50,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  chatTimestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptyStateSubText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '80%',
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  authRequiredText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  authRequiredSubText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '80%',
  },
});
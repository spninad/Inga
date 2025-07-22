import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { getChats, createNewChat, Chat } from '../lib/chat.service.ts';
import { supabase } from '../lib/supabaseClient.ts';

export default function ChatsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const navigation = useNavigation();

  const fetchUserAndChats = useCallback(async (currentUserId: string) => {
    try {
      const fetchedChats = await getChats(currentUserId);
      setChats(fetchedChats);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch chats.');
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        await fetchUserAndChats(session.user.id);
      } else {
        router.replace('/login');
      }
      setIsLoading(false);
    };

    checkUser();
  }, [router, fetchUserAndChats]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('public:chats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats', filter: `user_id=eq.${userId}` },
        () => fetchUserAndChats(userId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUserAndChats]);

  const handleCreateNewChat = useCallback(async () => {
    if (!userId) {
      Alert.alert('Authentication Required', 'Please sign in to create a chat');
      return;
    }
    try {
      const newChat = await createNewChat(userId, 'New Chat');
      router.push(`/chat/${newChat.id}`);
    } catch (error) {
      Alert.alert('Error', 'Could not create a new chat. Please try again.');
    }
  }, [userId, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleCreateNewChat} style={{ marginRight: 15 }}>
          <Ionicons name="add" size={30} color="#636ae8" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleCreateNewChat]);

  const renderItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity style={styles.chatItem} onPress={() => router.push(`/chat/${item.id}`)}>
      <Ionicons name="chatbubble-ellipses-outline" size={24} color="#636ae8" style={styles.chatIcon} />
      <View style={styles.chatTextContainer}>
        <Text style={styles.chatTitle}>{item.title}</Text>
        <Text style={styles.chatDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#636ae8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {chats.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyMessage}>No chats yet.</Text>
          <TouchableOpacity onPress={handleCreateNewChat} style={styles.newChatButton}>
            <Text style={styles.newChatButtonText}>Start a New Chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chatIcon: {
    marginRight: 15,
  },
  chatTextContainer: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
  },
  chatDate: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyMessage: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 20,
  },
  newChatButton: {
    backgroundColor: '#636ae8',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  newChatButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
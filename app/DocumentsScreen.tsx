import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getDocuments, Document, deleteDocument } from '../lib/documents.service';
import { startDocumentChat } from '../lib/chat.service';
import { supabase } from '../lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimePostgresInsertPayload } from '@supabase/supabase-js'; // Import the type from Supabase
import { Stack } from 'expo-router';

export default function DocumentsScreen() {
  // Add Stack.Screen component for this screen's title
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    getUserAndLoadDocuments();

    // Subscribe to Supabase Realtime for the `documents` table
    const subscription = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'documents' },
        (payload: RealtimePostgresInsertPayload<Document>) => { // Define the type for payload
          console.log('New document added:', payload.new);
          setDocuments((prevDocuments) => [payload.new, ...prevDocuments]); // Add the new document to the top of the list
        }
      )
      .subscribe();

    // Cleanup the subscription when the component unmounts
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);
  // Replace useEffect with useFocusEffect to refresh on navigation
  useFocusEffect(
    useCallback(() => {
      // Get user and load documents each time the screen comes into focus
      getUserAndLoadDocuments();
    }, [])
  );

  const getUserAndLoadDocuments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Authentication Required', 'Please sign in to view your documents');
        router.replace('/auth/login');
        return;
      }
      setUserId(session.user.id);
      await loadDocuments(session.user.id);
    } catch (error) {
      console.error('Error getting authentication:', error);
      setIsLoading(false);
    }
  };

  const loadDocuments = async (uid: string) => {
    try {
      setIsLoading(true);
      const docs = await getDocuments(uid);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentAdded = (newDocument: Document) => {
    setDocuments((prevDocuments) => [newDocument, ...prevDocuments]); // Add the new document to the top of the list
  };

  const handleAddDocument = () => {
    if (!userId) {
      Alert.alert('Authentication Required', 'Please sign in to add documents');
      return;
    }

    router.push({
      pathname: '/add-document',
      params: { onDocumentAdded: handleDocumentAdded }, // Pass the callback function
    });
  };

  const handleChatWithDocument = async (document: Document) => {
    if (!userId) {
      Alert.alert('Authentication Required', 'Please sign in to chat with documents');
      return;
    }
    
    try {
      const chatSession = await startDocumentChat(document);
      
      try {
        await AsyncStorage.setItem(`chat_${chatSession.id}`, JSON.stringify(chatSession));
        console.log("Saved chat session to AsyncStorage:", chatSession.id);
      } catch (storageError) {
        console.error("AsyncStorage error:", storageError);
      }
      
      router.push({
        pathname: '/chat/[id]',
        params: { 
          id: chatSession.id, 
          isNew: 'true',
          documentId: document.id 
        }
      });
    } catch (error) {
      console.error('Error starting chat with document:', error);
      Alert.alert('Error', 'Failed to start chat with this document');
    }
  };

  const handleDeleteDocument = async (document: Document) => {
    if (!userId) {
      Alert.alert('Authentication Required', 'Please sign in to delete documents');
      return;
    }
    
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const success = await deleteDocument(document.id, userId);
              if (success) {
                setDocuments(documents.filter(doc => doc.id !== document.id));
                Alert.alert('Success', 'Document deleted successfully');
              } else {
                throw new Error('Failed to delete document');
              }
            } catch (error) {
              console.error('Error deleting document:', error);
              Alert.alert('Error', 'Failed to delete document');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#636ae8" />
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.authRequiredContainer}>
        <Ionicons name="lock-closed" size={64} color="#ccc" />
        <Text style={styles.authRequiredText}>Authentication Required</Text>
        <Text style={styles.authRequiredSubText}>
          Please sign in to view and manage your documents
        </Text>
      </View>
    );
  }

  return (
    <>
     <Stack.Screen 
        options={{
          title: 'Documents',
          headerLargeTitle: true,
        }}
      />
    <View style={styles.container}>
      <Text style={styles.title}>My Documents</Text>

      <TouchableOpacity style={styles.addButton} onPress={handleAddDocument}>
        <Ionicons name="add-circle" size={24} color="white" />
        <Text style={styles.addButtonText}>Add Document</Text>
      </TouchableOpacity>

      {documents.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>No documents yet</Text>
          <Text style={styles.emptyStateSubText}>
            Add your first document to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.documentItem}>
              <TouchableOpacity
                style={styles.documentPreview}
                onPress={() => router.push(`/document/${item.id}`)}
              >
                {item.images && item.images.length > 0 ? (
                  <View style={styles.thumbnailContainer}>
                    <Text style={styles.imageCount}>
                      {item.images.length} {item.images.length === 1 ? 'image' : 'images'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.noThumbnail}>
                    <Ionicons name="document" size={32} color="#ccc" />
                  </View>
                )}
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName}>{item.name}</Text>
                  <Text style={styles.documentDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <View style={styles.documentActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleChatWithDocument(item)}
                >
                  <Ionicons name="chatbubble" size={22} color="#636ae8" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDeleteDocument(item)}
                >
                  <Ionicons name="trash-outline" size={22} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.documentsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#636ae8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  documentsList: {
    paddingBottom: 20,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  documentPreview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 106, 232, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  imageCount: {
    fontSize: 12,
    color: '#636ae8',
    fontWeight: '500',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  documentDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
    color: '#333',
    marginTop: 16,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
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
    color: '#333',
    marginTop: 16,
  },
  authRequiredSubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '80%',
  },
});
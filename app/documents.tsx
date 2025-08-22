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
import { Theme } from '@/constants/Theme';

export default function DocumentsScreen() {
  // Add Stack.Screen component for this screen's title
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // Remove useEffect that calls getUserAndLoadDocuments to avoid double fetch
  // Replace useEffect with useFocusEffect to refresh on navigation
  useFocusEffect(
    useCallback(() => {
      // Get user and load documents each time the screen comes into focus
      getUserAndLoadDocuments();

      // Subscribe to Supabase Realtime for the `documents` table
      const subscription = supabase
        .channel('documents-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'documents' },
          (payload: RealtimePostgresInsertPayload<Document>) => {
            setDocuments((prevDocuments) => [payload.new, ...prevDocuments]);
          }
        )
        .subscribe();

      // Cleanup the subscription when the screen loses focus
      return () => {
        supabase.removeChannel(subscription);
      };
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

    router.push('/add-document');
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

  const handleExtractFormFromDocument = (document: Document) => {
    if (!userId) {
      Alert.alert('Authentication Required', 'Please sign in to extract forms');
      return;
    }
    
    if (!document.images || document.images.length === 0) {
      Alert.alert('No Images', 'This document has no images to analyze for form extraction');
      return;
    }
    
    router.push({
      pathname: '/extract-form',
      params: { documentId: document.id }
    });
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
                setDocuments((prevDocs) => prevDocs.filter(doc => doc.id !== document.id));
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
        <ActivityIndicator size="large" color={Theme.colors.brand} />
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

      <TouchableOpacity style={styles.addButton} onPress={handleAddDocument}>
        <Ionicons name="add-circle" size={24} color={Theme.colors.textInverse} />
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
                    <Ionicons name="document" size={32} color={Theme.colors.textSecondary} />
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
                  <Ionicons name="chatbubble" size={22} color={Theme.colors.brand} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleExtractFormFromDocument(item)}
                >
                  <Ionicons name="document-text" size={22} color={Theme.colors.success} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDeleteDocument(item)}
                >
                  <Ionicons name="trash-outline" size={22} color={Theme.colors.danger} />
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
    backgroundColor: Theme.colors.background,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    color: Theme.colors.textPrimary,
    letterSpacing: -0.5,
    fontFamily: 'Inter_800ExtraBold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.brand,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    ...Theme.shadows.md,
  },
  addButtonText: {
    color: Theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'Inter_600SemiBold',
  },
  documentsList: {
    paddingBottom: 20,
  },
  documentItem: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    ...Theme.shadows.md,
    borderWidth: 1,
    borderColor: Theme.colors.lineMuted,
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  thumbnailContainer: {
    width: 64,
    height: 64,
    backgroundColor: Theme.colors.surfaceMuted,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  noThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: Theme.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  imageCount: {
    fontSize: 12,
    color: Theme.colors.brand,
    fontWeight: '500',
    fontFamily: 'Inter_600SemiBold',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.2,
    fontFamily: 'Inter_700Bold',
  },
  documentDate: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
    fontFamily: 'Inter_600SemiBold',
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: Theme.colors.surfaceMuted,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginTop: 24,
    letterSpacing: -0.3,
    fontFamily: 'Inter_700Bold',
  },
  emptyStateSubText: {
    fontSize: 16,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: '80%',
    lineHeight: 24,
    fontFamily: 'Inter_400Regular',
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  authRequiredText: {
    fontSize: 24,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginTop: 16,
    fontFamily: 'Inter_700Bold',
  },
  authRequiredSubText: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '80%',
    fontFamily: 'Inter_400Regular',
  },
});
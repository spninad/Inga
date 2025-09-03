import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getDocuments, Document, deleteDocument } from '../lib/documents.service.ts';
import { startDocumentChat } from '../lib/chat.service.ts';
import { supabase } from '../lib/supabaseClient.ts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimePostgresInsertPayload } from '@supabase/supabase-js'; // Import the type from Supabase
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';

export default function DocumentsScreen() {
  // Add Stack.Screen component for this screen's title
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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

  const handleExtractFormFromDocument = async (document: Document) => {
    if (!userId) {
      Alert.alert('Authentication Required', 'Please sign in to extract forms');
      return;
    }
    
    if (!document.images || document.images.length === 0) {
      Alert.alert('No Images', 'This document has no images to analyze for form extraction');
      return;
    }
    
    // Import the forms service functions we need
    const { hasExistingForms, getFormsByDocumentId } = await import('../lib/forms.service.ts');
    
    // Check if forms already exist for this document
    const existingFormsExist = await hasExistingForms(document.id, userId);
    
    if (existingFormsExist) {
      const existingForms = await getFormsByDocumentId(document.id, userId);
      Alert.alert(
        'Existing Forms Found',
        `This document already has ${existingForms.length} form(s) created from it. What would you like to do?`,
        [
          {
            text: 'View Existing Forms',
            onPress: () => {
              router.push({
                pathname: '/forms/screens/ManualFormScreen',
                params: { 
                  formId: existingForms[0].id,
                  documentId: document.id,
                  preview: 'true'
                }
              });
            }
          },
          {
            text: 'Create New Form',
            onPress: () => {
              router.push({
                pathname: '/extract-form',
                params: { documentId: document.id }
              });
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else {
      router.push({
        pathname: '/extract-form',
        params: { documentId: document.id }
      });
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
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  if (!userId) {
    return (
      <ThemedView style={styles.authRequiredContainer}>
        <Ionicons name="lock-closed" size={64} color={colors.textTertiary} />
        <ThemedText style={styles.authRequiredText}>Authentication Required</ThemedText>
        <ThemedText style={styles.authRequiredSubText}>
          Please sign in to view and manage your documents
        </ThemedText>
      </ThemedView>
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
    <ThemedView style={styles.container}>

      <ThemedButton
        title="Add Document"
        onPress={handleAddDocument}
        style={styles.addButton}
      />

      {documents.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <Ionicons name="document-outline" size={64} color={colors.textTertiary} />
          <ThemedText style={styles.emptyStateText}>No documents yet</ThemedText>
          <ThemedText style={styles.emptyStateSubText}>
            Add your first document to get started
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ThemedCard style={styles.documentItem}>
              <TouchableOpacity
                style={styles.documentPreview}
                onPress={() => router.push(`/document/${item.id}`)}
              >
                {item.images && item.images.length > 0 ? (
                  <View style={[styles.thumbnailContainer, { backgroundColor: colors.primary + '20' }]}>
                    <ThemedText style={[styles.imageCount, { color: colors.primary }]}>
                      {item.images.length} {item.images.length === 1 ? 'image' : 'images'}
                    </ThemedText>
                  </View>
                ) : (
                  <View style={[styles.noThumbnail, { backgroundColor: colors.backgroundSecondary }]}>
                    <Ionicons name="document" size={32} color={colors.textTertiary} />
                  </View>
                )}
                <View style={styles.documentInfo}>
                  <ThemedText style={styles.documentName}>{item.name}</ThemedText>
                  <ThemedText style={styles.documentDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </ThemedText>
                </View>
              </TouchableOpacity>
              
              <View style={styles.documentActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleChatWithDocument(item)}
                >
                  <Ionicons name="chatbubble" size={22} color={colors.primary} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleExtractFormFromDocument(item)}
                >
                  <Ionicons name="document-text" size={22} color={colors.accent} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDeleteDocument(item)}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </ThemedCard>
          )}
          style={styles.documentsList}
          contentContainerStyle={styles.documentsListContent}
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
    padding: 20,
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
  addButton: {
    marginBottom: 20,
  },
  documentsList: {
    flex: 1,
  },
  documentsListContent: {
    paddingBottom: 20,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  imageCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '500',
  },
  documentDate: {
    fontSize: 12,
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
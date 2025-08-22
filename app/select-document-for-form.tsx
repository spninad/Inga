import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabaseClient.ts';
import { getDocuments, Document } from '@/lib/documents.service.ts';
import { extractFormFromDocument } from '@/lib/form-extraction.service.ts';
import { createForm } from '@/lib/forms.service.ts';

export default function SelectDocumentForFormScreen() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      getUserAndLoadDocuments();
    }, [])
  );

  const getUserAndLoadDocuments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Authentication Required', 'Please sign in to view documents');
        router.replace('/');
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
      // Filter to only show documents with actual images (not text content)
      const imageDocuments = docs.filter(doc => 
        doc.images && doc.images.some(img => 
          typeof img === 'string' && img.startsWith('data:image/')
        )
      );
      setDocuments(imageDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentSelect = async (document: Document) => {
    try {
      setIsProcessing(true);
      setProcessingDocId(document.id);

      if (!userId) {
        Alert.alert('Authentication Error', 'Please sign in again');
        return;
      }

      // Extract form from document using AI
      const extractedForm = await extractFormFromDocument(document);
      
      if (!extractedForm) {
        throw new Error('Failed to extract form from document');
      }

      // Convert ExtractedForm to FormSchema and save to forms list
      const formSchema = await createForm(
        extractedForm.name,
        extractedForm.description,
        extractedForm.fields.map(field => ({
          id: field.id,
          name: field.name,
          type: field.type,
          label: field.label,
          required: field.required || false,
          placeholder: field.placeholder,
          options: field.options
        })),
        userId
      );

      if (!formSchema) {
        throw new Error('Failed to save form schema');
      }

      Alert.alert(
        'Form Created Successfully!',
        `Your form "${extractedForm.name}" has been created from the selected document.`,
        [
          {
            text: 'Fill Manually',
            onPress: () => {
              router.replace({
                pathname: '/forms/screens/ManualFormScreen',
                params: { 
                  formId: formSchema.id,
                  documentId: document.id
                }
              });
            }
          },
          {
            text: 'Fill with Voice',
            onPress: () => {
              router.replace({
                pathname: '/forms/screens/VoiceChatScreen',
                params: { 
                  formId: formSchema.id,
                  documentId: document.id
                }
              });
            }
          },
          {
            text: 'View Forms',
            onPress: () => router.replace('/forms')
          }
        ]
      );

    } catch (error) {
      console.error('Error processing document:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create form from document. Please try again.'
      );
    } finally {
      setIsProcessing(false);
      setProcessingDocId(null);
    }
  };

  const renderDocumentItem = ({ item }: { item: Document }) => {
    const isProcessingThis = processingDocId === item.id;
    const firstImage = item.images.find(img => typeof img === 'string' && img.startsWith('data:image/'));

    return (
      <TouchableOpacity
        style={[styles.documentItem, isProcessingThis && styles.processingItem]}
        onPress={() => handleDocumentSelect(item)}
        disabled={isProcessing}
      >
        <View style={styles.documentPreview}>
          {firstImage ? (
            <Image source={{ uri: firstImage }} style={styles.documentImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="document-outline" size={32} color="#ccc" />
            </View>
          )}
        </View>
        <View style={styles.documentInfo}>
          <Text style={styles.documentName}>{item.name}</Text>
          <Text style={styles.documentDate}>
            Created {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <Text style={styles.documentImages}>
            {item.images.length} image{item.images.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {isProcessingThis ? (
          <ActivityIndicator size="small" color="#636ae8" />
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#666" />
        )}
      </TouchableOpacity>
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
          title: 'Select Document',
          headerLargeTitle: false,
        }}
      />
      <View style={styles.container}>
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <Text style={styles.processingText}>Processing document...</Text>
            <Text style={styles.processingSubText}>
              Extracting form fields with AI
            </Text>
          </View>
        )}

        {documents.length > 0 ? (
          <>
            <Text style={styles.instruction}>
              Select a document to convert into a digital form
            </Text>
            <FlatList
              data={documents}
              keyExtractor={(item) => item.id}
              renderItem={renderDocumentItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No Documents Found</Text>
            <Text style={styles.emptyStateSubText}>
              You need to save some documents with images first before you can convert them to forms.
            </Text>
            <TouchableOpacity 
              style={styles.addDocumentButton}
              onPress={() => router.replace('/add-document')}
            >
              <Text style={styles.addDocumentButtonText}>Add Document</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  processingOverlay: {
    backgroundColor: '#f0f4ff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636ae8',
  },
  processingSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  instruction: {
    fontSize: 16,
    color: '#333',
    padding: 16,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  processingItem: {
    opacity: 0.7,
  },
  documentPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
  },
  documentImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  documentImages: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    lineHeight: 20,
  },
  addDocumentButton: {
    backgroundColor: '#636ae8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  addDocumentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

import React, { useState, useEffect } from 'react';
import { View, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '../../lib/supabaseClient.ts';
import { Document, getDocumentById } from '../../lib/documents.service.ts';
import { FormSchema, getForms, saveFilledForm } from '../../lib/forms.service.ts';
import { extractFormDataFromDocument, saveFormAsDocument } from '../../lib/forms-documents.service.ts';
import FormFiller from '../../components/FormFiller.tsx';

export default function FillFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const documentId = params.documentId as string;
  const formId = params.formId as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [initialData, setInitialData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    initializeFormFilling();
  }, [documentId, formId]);

  const initializeFormFilling = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Authentication Required', 'Please sign in to fill forms');
        router.replace('/auth/login');
        return;
      }
      setUserId(session.user.id);

      // Load document and form
      const [docResult, forms] = await Promise.all([
        getDocumentById(documentId),
        getForms(session.user.id)
      ]);

      if (!docResult) {
        Alert.alert('Error', 'Document not found');
        router.back();
        return;
      }
      setDocument(docResult);

      const form = forms.find(f => f.id === formId);
      if (!form) {
        Alert.alert('Error', 'Form not found');
        router.back();
        return;
      }
      setFormSchema(form);

      // Extract initial data from document (AI-assisted)
      const extractedData = await extractFormDataFromDocument(docResult, form);
      setInitialData(extractedData);
    } catch (error) {
      console.error('Error initializing form filling:', error);
      Alert.alert('Error', 'Failed to initialize form filling');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data: Record<string, any>, completed: boolean) => {
    if (!formSchema || !userId) return;

    try {
      const result = await saveFilledForm(
        formSchema.id,
        formSchema.name,
        data,
        completed,
        userId
      );

      if (result) {
        Alert.alert(
          'Success',
          completed ? 'Form completed successfully!' : 'Form draft saved successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save form');
      }
    } catch (error) {
      console.error('Error saving form:', error);
      Alert.alert('Error', 'Failed to save form');
    }
  };

  const handleSaveAsDocument = async (data: Record<string, any>) => {
    if (!formSchema || !userId) return;

    try {
      // First save as filled form
      const filledForm = await saveFilledForm(
        formSchema.id,
        formSchema.name,
        data,
        false, // Not completed yet, just saving as document
        userId
      );

      if (filledForm) {
        // Then save as document
        const document = await saveFormAsDocument(filledForm, formSchema, userId);
        
        if (document) {
          Alert.alert(
            'Success',
            'Form saved as document successfully!',
            [
              {
                text: 'OK',
                onPress: () => router.back()
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to save form as document');
        }
      } else {
        Alert.alert('Error', 'Failed to save form data');
      }
    } catch (error) {
      console.error('Error saving form as document:', error);
      Alert.alert('Error', 'Failed to save form as document');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Form',
      'Are you sure you want to cancel? Any unsaved changes will be lost.',
      [
        { text: 'Continue Editing', style: 'cancel' },
        { 
          text: 'Cancel', 
          style: 'destructive',
          onPress: () => router.back()
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

  if (!formSchema || !document) {
    return null;
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: `Fill Form`,
          headerLargeTitle: false,
        }}
      />
      <FormFiller
        formSchema={formSchema}
        initialData={initialData}
        onSave={handleSave}
        onSaveAsDocument={handleSaveAsDocument}
        onCancel={handleCancel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
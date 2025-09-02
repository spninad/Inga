import React, { useState, useEffect } from 'react';
import { View, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '../lib/supabaseClient';
import { getForms, saveFilledForm } from '../lib/forms.service';
import { FormSchema } from '../types/form';
import FormFiller from '../components/FormFiller';

export default function FillFormTemplateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const formId = params.formId as string;

  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    initializeFormFilling();
  }, [formId]);

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

      // Load form template
      const forms = await getForms(session.user.id);
      const form = forms.find(f => f.id === formId);
      
      if (!form) {
        Alert.alert('Error', 'Form template not found');
        router.back();
        return;
      }
      setFormSchema(form);
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

  if (!formSchema) {
    return null;
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: `Fill ${formSchema.name}`,
          headerLargeTitle: false,
        }}
      />
      <FormFiller
        formSchema={formSchema}
        initialData={{}}
        onSave={handleSave}
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

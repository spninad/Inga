import React, { useState, useEffect } from 'react';
import { View, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '../lib/supabaseClient';
import { getForms, getFilledFormById, updateFilledForm } from '../lib/forms.service';
import { FormSchema, FilledForm } from '../types/form';
import FormFiller from '../components/FormFiller';

export default function ViewFilledFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const filledFormId = params.filledFormId as string;

  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [filledForm, setFilledForm] = useState<FilledForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    initializeFormViewing();
  }, [filledFormId]);

  const initializeFormViewing = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Authentication Required', 'Please sign in to view forms');
        router.replace('/auth/login');
        return;
      }
      setUserId(session.user.id);

      // Load filled form
      const filledFormData = await getFilledFormById(filledFormId, session.user.id);
      if (!filledFormData) {
        Alert.alert('Error', 'Filled form not found');
        router.back();
        return;
      }
      setFilledForm(filledFormData);

      // Load form template for this filled form
      const forms = await getForms(session.user.id);
      const formTemplate = forms.find(f => f.id === filledFormData.form_id);
      
      if (!formTemplate) {
        Alert.alert('Error', 'Form template not found');
        router.back();
        return;
      }
      setFormSchema(formTemplate);
    } catch (error) {
      console.error('Error initializing form viewing:', error);
      Alert.alert('Error', 'Failed to initialize form viewing');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data: Record<string, any>, completed: boolean) => {
    if (!filledForm || !userId) return;

    try {
      const result = await updateFilledForm(filledForm.id, {
        data,
        completed
      });

      if (result) {
        setFilledForm(result);
        Alert.alert(
          'Success',
          completed ? 'Form updated and completed!' : 'Form changes saved successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save form changes');
      }
    } catch (error) {
      console.error('Error saving form changes:', error);
      Alert.alert('Error', 'Failed to save form changes');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard any unsaved changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { 
          text: 'Discard', 
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

  if (!formSchema || !filledForm) {
    return null;
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: filledForm.completed ? `View ${filledForm.form_name}` : `Edit ${filledForm.form_name}`,
          headerLargeTitle: false,
        }}
      />
      <FormFiller
        formSchema={formSchema}
        initialData={filledForm.data}
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

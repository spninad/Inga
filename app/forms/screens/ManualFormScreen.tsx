import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FormField } from '../services/FormProcessingService.ts';
import { StorageService } from '../services/StorageService.ts';
import { parseFormFields } from '../utils/formUtils.ts';
import { createDocument } from '../../../lib/documents.service.ts';
import { supabase } from '../../../lib/supabaseClient.ts';
import * as FileSystem from 'expo-file-system';

export default function ManualFormScreen() {
  const router = useRouter();
  const { imageUri, formFields: formFieldsString, documentId } = useLocalSearchParams<{ imageUri?: string; formFields: string; documentId?: string }>();

  const [formState, setFormState] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<FormField[]>([]);

  useEffect(() => {
    const formFieldsArray = parseFormFields(formFieldsString);
    setFields(formFieldsArray);

    const initialState = formFieldsArray.reduce((acc: Record<string, string>, field: FormField) => {
      acc[field.fieldName] = '';
      return acc;
    }, {});
    setFormState(initialState);
  }, [formFieldsString]);

  const handleInputChange = (fieldName: string, value: string) => {
    setFormState(prevState => ({
      ...prevState,
      [fieldName]: value,
    }));
  };

  const handleSave = async () => {
    try {
      await StorageService.saveForm(formState);

      if (!documentId && imageUri) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const dataUrl = `data:image/jpeg;base64,${base64}`;
          await createDocument(`Form ${new Date().toISOString()}`, [dataUrl], session.user.id);
        }
      }

      console.log('Form data saved successfully!');
      router.push('/');
    } catch (error) {
      console.error('Failed to save form:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Fill Form Manually</Text>
        {fields.length > 0 ? (
          fields.map(field => (
            <View key={field.fieldName} style={styles.fieldContainer}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={styles.input}
                value={formState[field.fieldName]}
                onChangeText={text => handleInputChange(field.fieldName, text)}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                keyboardType={field.type === 'number' || field.type === 'phone' ? 'numeric' : 'default'}
                autoCapitalize="none"
              />
            </View>
          ))
        ) : (
          <Text>Loading form...</Text>
        )}
        <Button title="Save" onPress={handleSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
  },
});
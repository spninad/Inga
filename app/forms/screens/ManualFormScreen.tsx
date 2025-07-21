import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FormField } from '../services/FormProcessingService.js';
import { StorageService } from '../services/StorageService.js';

export default function ManualFormScreen() {
  const router = useRouter();
  const { formFields: formFieldsString } = useLocalSearchParams<{ formFields: string }>();

  const [formState, setFormState] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<FormField[]>([]);

  useEffect(() => {
    if (formFieldsString) {
      try {
        const parsedFields = JSON.parse(formFieldsString);
        setFields(parsedFields);

        // Initialize form state
        const initialState = parsedFields.reduce((acc: Record<string, string>, field: FormField) => {
          acc[field.fieldName] = '';
          return acc;
        }, {});
        setFormState(initialState);
      } catch (error) {
        console.error('Failed to parse form fields:', error);
      }
    }
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
      console.log('Form data saved successfully!');
      // Navigate home after saving
      router.push('/');
    } catch (error) {
      console.error('Failed to save form:', error);
      // Optionally, show an error message to the user
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
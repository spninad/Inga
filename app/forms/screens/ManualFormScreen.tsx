import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabaseClient.ts';
import { getFormById } from '../../../lib/forms.service.ts';
import { saveFilledForm } from '../../../lib/forms.service.ts';
import { FormSchema, FormField } from '../../../types/form.ts';

export default function ManualFormScreen() {
  const router = useRouter();
  const { formId, documentId } = useLocalSearchParams<{ formId?: string; documentId?: string }>();

  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadForm();
  }, []);

  const loadForm = async () => {
    try {
      setIsLoading(true);

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Authentication Required', 'Please sign in to fill forms');
        router.replace('/');
        return;
      }
      setUserId(session.user.id);

      if (!formId) {
        Alert.alert('Error', 'No form ID provided');
        router.back();
        return;
      }

      // Load the form schema
      const form = await getFormById(formId);
      if (!form) {
        Alert.alert('Error', 'Form not found');
        router.back();
        return;
      }

      setFormSchema(form);

      // Initialize form data with empty values
      const initialData: Record<string, any> = {};
      form.fields.forEach(field => {
        initialData[field.id] = field.type === 'checkbox' ? false : '';
      });
      setFormData(initialData);

    } catch (error) {
      console.error('Error loading form:', error);
      Alert.alert('Error', 'Failed to load form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prevState => ({
      ...prevState,
      [fieldId]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formSchema) return false;

    const errors: string[] = [];
    formSchema.fields.forEach(field => {
      if (field.required && !formData[field.id]) {
        errors.push(field.label);
      }
    });

    if (errors.length > 0) {
      Alert.alert('Missing Required Fields', `Please fill in: ${errors.join(', ')}`);
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!formSchema || !userId) return;

    if (!validateForm()) return;

    try {
      setIsSaving(true);

      const filledForm = await saveFilledForm(
        formSchema.id,
        formSchema.name,
        formData,
        true, // completed
        userId
      );

      if (!filledForm) {
        throw new Error('Failed to save form');
      }

      Alert.alert(
        'Form Saved Successfully!',
        `Your completed form "${formSchema.name}" has been saved.`,
        [
          { text: 'View Forms', onPress: () => router.replace('/forms') },
          { text: 'OK', onPress: () => router.back() }
        ]
      );

    } catch (error) {
      console.error('Error saving form:', error);
      Alert.alert('Error', 'Failed to save form. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formSchema || !userId) return;

    try {
      setIsSaving(true);

      const filledForm = await saveFilledForm(
        formSchema.id,
        formSchema.name,
        formData,
        false, // draft
        userId
      );

      if (!filledForm) {
        throw new Error('Failed to save draft');
      }

      Alert.alert('Draft Saved', 'Your form has been saved as a draft.');

    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderFormField = (field: FormField) => {
    const value = formData[field.id];

    switch (field.type) {
      case 'checkbox':
        return (
          <TouchableOpacity
            key={field.id}
            style={styles.checkboxContainer}
            onPress={() => handleInputChange(field.id, !value)}
          >
            <View style={[styles.checkbox, value && styles.checkboxChecked]}>
              {value && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>{field.label}</Text>
            {field.required && <Text style={styles.required}>*</Text>}
          </TouchableOpacity>
        );
      
      case 'select':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.selectContainer}>
              {field.options?.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.selectOption,
                    value === option && styles.selectOptionSelected
                  ]}
                  onPress={() => handleInputChange(field.id, option)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    value === option && styles.selectOptionTextSelected
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      
      case 'textarea':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={value || ''}
              onChangeText={text => handleInputChange(field.id, text)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        );
      
      default:
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={styles.input}
              value={value || ''}
              onChangeText={text => handleInputChange(field.id, text)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              keyboardType={
                field.type === 'number' ? 'numeric' :
                field.type === 'phone' ? 'phone-pad' :
                field.type === 'email' ? 'email-address' :
                'default'
              }
              autoCapitalize={field.type === 'email' ? 'none' : 'words'}
            />
          </View>
        );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#636ae8" />
        <Text style={styles.loadingText}>Loading form...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Fill Form',
          headerLargeTitle: false,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{formSchema?.name || 'Fill Form Manually'}</Text>
            {formSchema?.description && (
              <Text style={styles.description}>{formSchema.description}</Text>
            )}
          </View>

          {formSchema?.fields.map(renderFormField)}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.draftButton]}
              onPress={handleSaveDraft}
              disabled={isSaving}
            >
              <Ionicons name="bookmark-outline" size={20} color="#666" />
              <Text style={styles.draftButtonText}>Save Draft</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, isSaving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={20} color="#fff" />
              )}
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Complete Form'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#636ae8',
    borderColor: '#636ae8',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  selectOptionSelected: {
    backgroundColor: '#f0f4ff',
  },
  selectOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectOptionTextSelected: {
    color: '#636ae8',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  draftButton: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  draftButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#636ae8',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
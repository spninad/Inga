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
import { supabase } from '../../../lib/supabaseClient';
import { getFormById } from '../../../lib/forms.service';
import { saveFilledForm } from '../../../lib/forms.service';
import { FormSchema, FormField } from '../../../types/form';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { ThemedButton } from '@/components/ThemedButton';

export default function ManualFormScreen() {
  const router = useRouter();
  const { formId, documentId, preview } = useLocalSearchParams<{ formId?: string; documentId?: string; preview?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showCompletedPreview, setShowCompletedPreview] = useState(false);
  const [savedFormId, setSavedFormId] = useState<string | null>(null);

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

      // Check if we're in preview mode (just viewing the form structure)
      setIsPreviewMode(preview === 'true');

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

  const handleClearFields = () => {
    Alert.alert(
      'Clear Form Fields',
      'Are you sure you want to clear all form fields?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            if (!formSchema) return;
            const clearedData: Record<string, any> = {};
            formSchema.fields.forEach(field => {
              clearedData[field.id] = field.type === 'checkbox' ? false : '';
            });
            setFormData(clearedData);
          }
        }
      ]
    );
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

      // Show completed form preview
      setSavedFormId(filledForm.id);
      setShowCompletedPreview(true);

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

  const renderPreviewField = (field: FormField) => {
    return (
      <View key={field.id} style={styles.previewFieldContainer}>
        <View style={styles.previewFieldHeader}>
          <Text style={styles.previewLabel}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <View style={styles.previewTypeChip}>
            <Text style={styles.previewTypeText}>
              {field.type.charAt(0).toUpperCase() + field.type.slice(1)}
            </Text>
          </View>
        </View>
        {field.placeholder && (
          <Text style={styles.previewPlaceholder}>
            {field.placeholder}
          </Text>
        )}
        {field.options && (
          <View style={styles.previewOptions}>
            <Text style={styles.previewOptionsLabel}>Options: </Text>
            <Text style={styles.previewOptionsText}>
              {field.options.join(', ')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderCompletedField = (field: FormField) => {
    const value = formData[field.id];
    const displayValue = field.type === 'checkbox' 
      ? (value ? 'Yes' : 'No')
      : (value || 'Not provided');

    return (
      <View key={field.id} style={styles.completedFieldContainer}>
        <Text style={styles.completedFieldLabel}>
          {field.label}
          {field.required && <Text style={styles.required}> *</Text>}
        </Text>
        <Text style={styles.completedFieldValue}>{displayValue}</Text>
      </View>
    );
  };

  const renderCompletedPreview = () => {
    if (!formSchema) return null;

    return (
      <View style={styles.completedPreviewContainer}>
        <ScrollView contentContainerStyle={styles.completedScrollContainer}>
          <View style={styles.completedHeader}>
            <Ionicons name="checkmark-circle" size={48} color="#28a745" />
            <Text style={styles.completedTitle}>Form Completed Successfully!</Text>
            <Text style={styles.completedSubtitle}>
              "{formSchema.name}" has been saved to your forms.
            </Text>
          </View>

          <View style={styles.completedFormPreview}>
            <Text style={styles.completedSectionTitle}>Form Summary</Text>
            {formSchema.fields.map(renderCompletedField)}
          </View>

          <View style={styles.completedButtonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.viewFormsButton]}
              onPress={() => {
                setShowCompletedPreview(false);
                router.replace('/forms');
              }}
            >
              <Ionicons name="list" size={20} color="#fff" />
              <Text style={styles.viewFormsButtonText}>View All Forms</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.newFormButton]}
              onPress={() => {
                setShowCompletedPreview(false);
                // Reset form data for new entry
                const initialData: Record<string, any> = {};
                formSchema.fields.forEach(field => {
                  initialData[field.id] = field.type === 'checkbox' ? false : '';
                });
                setFormData(initialData);
              }}
            >
              <Ionicons name="add-circle" size={20} color="#636ae8" />
              <Text style={styles.newFormButtonText}>Fill Another Form</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#636ae8" />
        <Text style={styles.loadingText}>Loading form...</Text>
      </View>
    );
  }

  // Show completed preview if form was just saved
  if (showCompletedPreview) {
    return (
      <>
        <Stack.Screen 
          options={{
            title: 'Form Completed',
            headerLargeTitle: false,
          }}
        />
        {renderCompletedPreview()}
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: isPreviewMode ? 'Form Preview' : 'Fill Form',
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
            {isPreviewMode && (
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>Preview Mode</Text>
              </View>
            )}
          </View>

          {formSchema?.fields.map(field => 
            isPreviewMode ? renderPreviewField(field) : renderFormField(field)
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={handleClearFields}
              disabled={isSaving}
            >
              <Ionicons name="refresh-outline" size={20} color="#666" />
              <Text style={styles.clearButtonText}>Clear Fields</Text>
            </TouchableOpacity>

            {!isPreviewMode && (
              <>
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
              </>
            )}

            {isPreviewMode && (
              <TouchableOpacity
                style={[styles.button, styles.fillButton]}
                onPress={() => {
                  setIsPreviewMode(false);
                }}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.fillButtonText}>Fill Form</Text>
              </TouchableOpacity>
            )}
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
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
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
    flexWrap: 'wrap',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    minWidth: 100,
  },
  clearButton: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  draftButton: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
  },
  draftButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#636ae8',
    flex: 1,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  fillButton: {
    backgroundColor: '#28a745',
    flex: 2,
  },
  fillButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  previewBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  previewBadgeText: {
    color: '#1976d2',
    fontSize: 12,
    fontWeight: '600',
  },
  previewFieldContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#636ae8',
  },
  previewFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  previewTypeChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  previewTypeText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  previewPlaceholder: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  previewOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  previewOptionsLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
    marginRight: 4,
  },
  previewOptionsText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  // Completed form preview styles
  completedPreviewContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  completedScrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  completedHeader: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#28a745',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  completedSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  completedFormPreview: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#636ae8',
    paddingBottom: 8,
  },
  completedFieldContainer: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  completedFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  completedFieldValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  completedButtonContainer: {
    gap: 12,
  },
  viewFormsButton: {
    backgroundColor: '#636ae8',
    flex: 1,
  },
  viewFormsButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  newFormButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#636ae8',
    flex: 1,
  },
  newFormButtonText: {
    fontSize: 16,
    color: '#636ae8',
    fontWeight: '600',
  },
});
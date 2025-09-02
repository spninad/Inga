import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { getDocumentById } from '../lib/documents.service';
import { 
  extractFormFromDocument, 
  ExtractedForm, 
  ExtractedField, 
  FilledFormData
} from '../lib/form-extraction.service';
import { saveFilledForm, createForm } from '../lib/forms.service';
import { FormSchema } from '../types/form';

export default function ExtractFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const documentId = params.documentId as string;

  const [isExtracting, setIsExtracting] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedForm, setExtractedForm] = useState<ExtractedForm | null>(null);
  const [formData, setFormData] = useState<FilledFormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedDropdown, setSelectedDropdown] = useState<string | null>(null);

  useEffect(() => {
    extractForm();
  }, []);

  const extractForm = async () => {
    try {
      setIsExtracting(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Authentication Required', 'Please sign in to extract forms');
        router.replace('/auth/login');
        return;
      }
      setUserId(session.user.id);

      // Get the document
      const document = await getDocumentById(documentId, session.user.id);
      if (!document) {
        Alert.alert('Error', 'Document not found');
        router.back();
        return;
      }

      // Extract form using AI
      const extracted = await extractFormFromDocument(document);
      if (!extracted) {
        Alert.alert('Error', 'Failed to extract form from document');
        router.back();
        return;
      }

      setExtractedForm(extracted);
      
      // Initialize form data
      const initialData: FilledFormData = {};
      extracted.fields.forEach(field => {
        initialData[field.id] = field.type === 'checkbox' ? false : '';
      });
      setFormData(initialData);

    } catch (error: any) {
      console.error('Error extracting form:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to extract form from document. Please try again.';
      
      if (error.message) {
        // Check for specific error types
        if (error.message.includes('not appear to contain a fillable form') || 
            error.message.includes('No fillable form fields')) {
          errorMessage = error.message;
        } else if (error.message.includes('valid JSON format')) {
          errorMessage = 'The AI had trouble analyzing this document. Please ensure the image is clear and contains a form, then try again.';
        } else if (error.message.includes('No response from OpenAI')) {
          errorMessage = 'Unable to analyze the document at this time. Please try again later.';
        } else if (error.message.includes('Failed to analyze document')) {
          errorMessage = 'There was an issue processing your document. Please try again or contact support if the problem persists.';
        }
      }
      
      Alert.alert(
        'Form Extraction Failed', 
        errorMessage,
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const updateField = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!extractedForm) return false;
    
    const newErrors: Record<string, string> = {};
    
    extractedForm.fields.forEach(field => {
      if (field.required) {
        const value = formData[field.id];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
      
      // Validate email format
      if (field.type === 'email' && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailValue = String(formData[field.id]);
        if (!emailRegex.test(emailValue)) {
          newErrors[field.id] = 'Please enter a valid email address';
        }
      }
      
      // Validate phone format (basic validation)
      if (field.type === 'phone' && formData[field.id]) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const phoneValue = String(formData[field.id]).replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(phoneValue)) {
          newErrors[field.id] = 'Please enter a valid phone number';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!extractedForm || !userId) return;
    
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // First, create and save the form template so it appears in "Your Forms"
      const formTemplate = await createForm(
        extractedForm.name,
        extractedForm.description,
        extractedForm.fields,
        userId,
        documentId
      );
      
      if (!formTemplate) {
        Alert.alert('Error', 'Failed to save form template. Please try again.');
        return;
      }
      
      // Then save the filled form data with correct form_id reference
      const filledForm = await saveFilledForm(
        formTemplate.id, // Use the template ID for proper linking
        formTemplate.name,
        formData,
        true, // completed
        userId
      );
      
      if (filledForm) {
        Alert.alert(
          'Success', 
          'Form template and completed form saved successfully!',
          [
            {
              text: 'View Forms',
              onPress: () => router.replace('/forms-list')
            },
            {
              text: 'OK',
              onPress: () => router.replace('/documents')
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save completed form. Please try again.');
      }
    } catch (error) {
      console.error('Error saving form:', error);
      Alert.alert('Error', 'Failed to save form. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: ExtractedField) => {
    const hasError = !!errors[field.id];
    
    switch (field.type) {
      case 'textarea':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.textArea, hasError && styles.inputError]}
              value={String(formData[field.id] || '')}
              onChangeText={(value) => updateField(field.id, value)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {hasError && <Text style={styles.errorText}>{errors[field.id]}</Text>}
          </View>
        );
        
      case 'checkbox':
        return (
          <View key={field.id} style={styles.checkboxContainer}>
            <Switch
              value={Boolean(formData[field.id])}
              onValueChange={(value) => updateField(field.id, value)}
              trackColor={{ false: '#767577', true: '#636ae8' }}
              thumbColor={formData[field.id] ? '#ffffff' : '#f4f3f4'}
            />
            <Text style={styles.checkboxLabel}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            {hasError && <Text style={styles.errorText}>{errors[field.id]}</Text>}
          </View>
        );
        
      case 'select':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TouchableOpacity
              style={[styles.dropdownButton, hasError && styles.inputError]}
              onPress={() => setSelectedDropdown(field.id)}
            >
              <Text style={[styles.dropdownText, !formData[field.id] && styles.placeholderText]}>
                {formData[field.id] || `Select ${field.label.toLowerCase()}`}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            
            <Modal
              visible={selectedDropdown === field.id}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setSelectedDropdown(null)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setSelectedDropdown(null)}
              >
                <View style={styles.dropdownModal}>
                  <FlatList
                    data={field.options || []}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.dropdownOption}
                        onPress={() => {
                          updateField(field.id, item);
                          setSelectedDropdown(null);
                        }}
                      >
                        <Text style={styles.dropdownOptionText}>{item}</Text>
                        {formData[field.id] === item && (
                          <Ionicons name="checkmark" size={20} color="#636ae8" />
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
            
            {hasError && <Text style={styles.errorText}>{errors[field.id]}</Text>}
          </View>
        );
        
      default:
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.textInput, hasError && styles.inputError]}
              value={String(formData[field.id] || '')}
              onChangeText={(value) => updateField(field.id, value)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              keyboardType={field.type === 'email' ? 'email-address' : 
                          field.type === 'phone' ? 'phone-pad' : 
                          field.type === 'number' ? 'numeric' : 'default'}
              autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
            />
            {hasError && <Text style={styles.errorText}>{errors[field.id]}</Text>}
          </View>
        );
    }
  };

  const getCompletionPercentage = (): number => {
    if (!extractedForm) return 0;
    
    const totalFields = extractedForm.fields.length;
    const completedFields = extractedForm.fields.filter(field => {
      const value = formData[field.id];
      return value && (typeof value !== 'string' || value.trim() !== '');
    }).length;
    
    return Math.round((completedFields / totalFields) * 100);
  };

  if (isExtracting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#636ae8" />
        <Text style={styles.loadingText}>Analyzing document...</Text>
        <Text style={styles.loadingSubText}>Extracting form fields using AI</Text>
      </View>
    );
  }

  if (!extractedForm) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#ff6b6b" />
        <Text style={styles.errorText}>Failed to extract form</Text>
      </View>
    );
  }

  const completionPercentage = getCompletionPercentage();

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Fill Extracted Form',
          headerLargeTitle: false,
        }}
      />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.formTitle}>{extractedForm.name}</Text>
          <Text style={styles.formDescription}>{extractedForm.description}</Text>
          
          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${completionPercentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{completionPercentage}% complete</Text>
          </View>
        </View>

        {/* Form fields */}
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {extractedForm.fields.map(renderField)}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Save Form</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  loadingSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  formDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e1e5e9',
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#636ae8',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636ae8',
  },
  scrollContainer: {
    flex: 1,
  },
  fieldContainer: {
    backgroundColor: 'white',
    padding: 12,
    marginTop: 6,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  required: {
    color: '#ff6b6b',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
    minHeight: 40,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    minHeight: 60,
    maxHeight: 120,
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    marginTop: 6,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    minHeight: 44,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderRadius: 8,
    maxHeight: 300,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    backgroundColor: '#636ae8',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
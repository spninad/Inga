import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
// Note: Using a simple TouchableOpacity for select fields instead of Picker for now
import { FormField, FormSchema, FilledForm } from '../types/form';
import { Ionicons } from '@expo/vector-icons';

interface FormFillerProps {
  formSchema: FormSchema;
  initialData?: Record<string, any>;
  onSave: (data: Record<string, any>, completed: boolean) => void;
  onCancel?: () => void;
}

export default function FormFiller({ formSchema, initialData = {}, onSave, onCancel }: FormFillerProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Initialize form data with default values
    const initData = { ...initialData };
    formSchema.fields.forEach(field => {
      if (!(field.id in initData)) {
        initData[field.id] = getDefaultValue(field);
      }
    });
    setFormData(initData);
  }, [formSchema, initialData]);

  const getDefaultValue = (field: FormField): any => {
    switch (field.type) {
      case 'checkbox':
        return false;
      case 'select':
        return field.options?.[0] || '';
      default:
        return field.value || '';
    }
  };

  const updateFieldValue = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id] || getDefaultValue(field);

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'address':
        return (
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={(text) => updateFieldValue(field.id, text)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            keyboardType={
              field.type === 'email' ? 'email-address' :
              field.type === 'phone' ? 'phone-pad' : 'default'
            }
            autoCapitalize={field.type === 'email' ? 'none' : 'words'}
          />
        );
      
      case 'number':
        return (
          <TextInput
            style={styles.textInput}
            value={value?.toString() || ''}
            onChangeText={(text) => updateFieldValue(field.id, text ? parseFloat(text) : '')}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            keyboardType="numeric"
          />
        );
      
      case 'textarea':
        return (
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={value}
            onChangeText={(text) => updateFieldValue(field.id, text)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        );
      
      case 'date':
        return (
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={(text) => updateFieldValue(field.id, text)}
            placeholder="YYYY-MM-DD"
          />
        );
      
      case 'select':
        return (
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => {
              Alert.alert(
                field.label,
                'Select an option:',
                field.options?.map(option => ({
                  text: option,
                  onPress: () => updateFieldValue(field.id, option)
                })) || []
              );
            }}
          >
            <Text style={[styles.selectText, !value && styles.placeholderText]}>
              {value || 'Select an option'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        );
      
      case 'checkbox':
        return (
          <View style={styles.checkboxContainer}>
            <Switch
              value={value || false}
              onValueChange={(newValue) => updateFieldValue(field.id, newValue)}
              trackColor={{ false: '#767577', true: '#636ae8' }}
              thumbColor={value ? '#f4f3f4' : '#f4f3f4'}
            />
            <Text style={styles.checkboxLabel}>
              {field.placeholder || 'Check if applicable'}
            </Text>
          </View>
        );
      
      default:
        return (
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={(text) => updateFieldValue(field.id, text)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
          />
        );
    }
  };

  const validateForm = (): boolean => {
    const requiredFields = formSchema.fields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => {
      const value = formData[field.id];
      return !value || value === '' || (field.type === 'checkbox' && !value);
    });

    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(f => f.label).join(', ');
      Alert.alert('Missing Required Fields', `Please fill in: ${fieldNames}`);
      return false;
    }

    return true;
  };

  const handleSave = (isCompleted: boolean = false) => {
    if (isCompleted && !validateForm()) {
      return;
    }

    onSave(formData, isCompleted);
  };

  const calculateProgress = (): number => {
    const totalFields = formSchema.fields.length;
    const filledFields = formSchema.fields.filter(field => {
      const value = formData[field.id];
      return value !== '' && value !== undefined && value !== null;
    }).length;

    return totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
  };

  const progress = calculateProgress();

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{formSchema.name}</Text>
          {formSchema.description && (
            <Text style={styles.description}>{formSchema.description}</Text>
          )}
          
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Progress: {Math.round(progress)}%
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${progress}%` }]} 
              />
            </View>
          </View>
        </View>

        <View style={styles.fieldsContainer}>
          {formSchema.fields.map((field) => (
            <View key={field.id} style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                {field.label}
                {field.required && <Text style={styles.required}> *</Text>}
              </Text>
              {renderField(field)}
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={() => handleSave(false)}
          >
            <Ionicons name="save-outline" size={20} color="white" />
            <Text style={styles.buttonText}>Save Draft</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.completeButton]}
            onPress={() => handleSave(true)}
          >
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.buttonText}>Complete</Text>
          </TouchableOpacity>
        </View>

        {onCancel && (
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#636ae8',
    borderRadius: 4,
  },
  fieldsContainer: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#dc3545',
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  checkboxLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#6c757d',
  },
  completeButton: {
    backgroundColor: '#28a745',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#dc3545',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  cancelButtonText: {
    color: '#dc3545',
  },
});
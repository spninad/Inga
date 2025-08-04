import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { FormSchema, FilledForm, FormTemplate } from '../types/form.ts';

// Local storage keys
const FORMS_STORAGE_KEY = 'forms';
const FILLED_FORMS_STORAGE_KEY = 'filled_forms';

// Helper function to get data from AsyncStorage
async function getStorageData<T>(key: string): Promise<T[]> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return [];
  }
}

// Helper function to set data in AsyncStorage
async function setStorageData<T>(key: string, data: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
    throw error;
  }
}

// Create a new form schema
export async function createForm(name: string, description: string, fields: any[], userId?: string): Promise<FormSchema | null> {
  try {
    const formId = uuidv4();
    const now = new Date().toISOString();
    
    const newForm: FormSchema = {
      id: formId,
      name,
      description,
      fields: fields.map(field => ({
        ...field,
        id: field.id || uuidv4()
      })),
      created_at: now,
      updated_at: now,
      user_id: userId
    };

    const forms = await getStorageData<FormSchema>(FORMS_STORAGE_KEY);
    forms.unshift(newForm);
    await setStorageData(FORMS_STORAGE_KEY, forms);
    
    return newForm;
  } catch (error) {
    console.error('Error creating form:', error);
    return null;
  }
}

// Get all forms for a user
export async function getForms(userId?: string): Promise<FormSchema[]> {
  try {
    const forms = await getStorageData<FormSchema>(FORMS_STORAGE_KEY);
    return userId ? forms.filter(form => form.user_id === userId) : forms;
  } catch (error) {
    console.error('Error getting forms:', error);
    return [];
  }
}

// Get a single form by ID
export async function getFormById(formId: string): Promise<FormSchema | null> {
  try {
    const forms = await getStorageData<FormSchema>(FORMS_STORAGE_KEY);
    return forms.find(form => form.id === formId) || null;
  } catch (error) {
    console.error('Error getting form by ID:', error);
    return null;
  }
}

// Update a form
export async function updateForm(formId: string, updates: Partial<FormSchema>): Promise<FormSchema | null> {
  try {
    const forms = await getStorageData<FormSchema>(FORMS_STORAGE_KEY);
    const formIndex = forms.findIndex(form => form.id === formId);
    
    if (formIndex === -1) {
      throw new Error('Form not found');
    }
    
    forms[formIndex] = {
      ...forms[formIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    await setStorageData(FORMS_STORAGE_KEY, forms);
    return forms[formIndex];
  } catch (error) {
    console.error('Error updating form:', error);
    return null;
  }
}

// Delete a form
export async function deleteForm(formId: string): Promise<boolean> {
  try {
    const forms = await getStorageData<FormSchema>(FORMS_STORAGE_KEY);
    const filteredForms = forms.filter(form => form.id !== formId);
    
    if (filteredForms.length === forms.length) {
      throw new Error('Form not found');
    }
    
    await setStorageData(FORMS_STORAGE_KEY, filteredForms);
    
    // Also delete any filled forms associated with this form
    const filledForms = await getStorageData<FilledForm>(FILLED_FORMS_STORAGE_KEY);
    const filteredFilledForms = filledForms.filter(filledForm => filledForm.form_id !== formId);
    await setStorageData(FILLED_FORMS_STORAGE_KEY, filteredFilledForms);
    
    return true;
  } catch (error) {
    console.error('Error deleting form:', error);
    return false;
  }
}

// Save a filled form
export async function saveFilledForm(formId: string, formName: string, data: Record<string, any>, completed: boolean = false, userId?: string): Promise<FilledForm | null> {
  try {
    const filledFormId = uuidv4();
    const now = new Date().toISOString();
    
    const filledForm: FilledForm = {
      id: filledFormId,
      form_id: formId,
      form_name: formName,
      data,
      completed,
      created_at: now,
      updated_at: now,
      user_id: userId
    };

    const filledForms = await getStorageData<FilledForm>(FILLED_FORMS_STORAGE_KEY);
    filledForms.unshift(filledForm);
    await setStorageData(FILLED_FORMS_STORAGE_KEY, filledForms);
    
    return filledForm;
  } catch (error) {
    console.error('Error saving filled form:', error);
    return null;
  }
}

// Get filled forms for a user
export async function getFilledForms(userId?: string): Promise<FilledForm[]> {
  try {
    const filledForms = await getStorageData<FilledForm>(FILLED_FORMS_STORAGE_KEY);
    return userId ? filledForms.filter(form => form.user_id === userId) : filledForms;
  } catch (error) {
    console.error('Error getting filled forms:', error);
    return [];
  }
}

// Get filled forms for a specific form schema
export async function getFilledFormsByFormId(formId: string, userId?: string): Promise<FilledForm[]> {
  try {
    const filledForms = await getStorageData<FilledForm>(FILLED_FORMS_STORAGE_KEY);
    let filtered = filledForms.filter(form => form.form_id === formId);
    return userId ? filtered.filter(form => form.user_id === userId) : filtered;
  } catch (error) {
    console.error('Error getting filled forms by form ID:', error);
    return [];
  }
}

// Update filled form
export async function updateFilledForm(filledFormId: string, updates: Partial<FilledForm>): Promise<FilledForm | null> {
  try {
    const filledForms = await getStorageData<FilledForm>(FILLED_FORMS_STORAGE_KEY);
    const formIndex = filledForms.findIndex(form => form.id === filledFormId);
    
    if (formIndex === -1) {
      throw new Error('Filled form not found');
    }
    
    filledForms[formIndex] = {
      ...filledForms[formIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    await setStorageData(FILLED_FORMS_STORAGE_KEY, filledForms);
    return filledForms[formIndex];
  } catch (error) {
    console.error('Error updating filled form:', error);
    return null;
  }
}

// Common form templates
export const commonFormTemplates: FormTemplate[] = [
  {
    id: 'medical-intake',
    name: 'Medical Intake Form',
    description: 'Basic patient information and medical history',
    category: 'healthcare',
    schema: {
      name: 'Medical Intake Form',
      description: 'Basic patient information and medical history',
      fields: [
        { id: 'first-name', name: 'firstName', type: 'text', label: 'First Name', required: true },
        { id: 'last-name', name: 'lastName', type: 'text', label: 'Last Name', required: true },
        { id: 'dob', name: 'dateOfBirth', type: 'date', label: 'Date of Birth', required: true },
        { id: 'phone', name: 'phone', type: 'phone', label: 'Phone Number', required: true },
        { id: 'email', name: 'email', type: 'email', label: 'Email Address' },
        { id: 'address', name: 'address', type: 'address', label: 'Address', required: true },
        { id: 'emergency-contact', name: 'emergencyContact', type: 'text', label: 'Emergency Contact Name', required: true },
        { id: 'emergency-phone', name: 'emergencyPhone', type: 'phone', label: 'Emergency Contact Phone', required: true },
        { id: 'medical-history', name: 'medicalHistory', type: 'textarea', label: 'Medical History', placeholder: 'Please describe any relevant medical conditions, allergies, or medications' }
      ]
    }
  },
  {
    id: 'insurance-form',
    name: 'Insurance Information Form',
    description: 'Patient insurance and billing information',
    category: 'healthcare',
    schema: {
      name: 'Insurance Information Form',
      description: 'Patient insurance and billing information',
      fields: [
        { id: 'patient-name', name: 'patientName', type: 'text', label: 'Patient Name', required: true },
        { id: 'insurance-provider', name: 'insuranceProvider', type: 'text', label: 'Insurance Provider', required: true },
        { id: 'policy-number', name: 'policyNumber', type: 'text', label: 'Policy Number', required: true },
        { id: 'group-number', name: 'groupNumber', type: 'text', label: 'Group Number' },
        { id: 'subscriber-name', name: 'subscriberName', type: 'text', label: 'Subscriber Name', required: true },
        { id: 'subscriber-dob', name: 'subscriberDob', type: 'date', label: 'Subscriber Date of Birth', required: true },
        { id: 'relationship', name: 'relationship', type: 'select', label: 'Relationship to Patient', required: true, options: ['Self', 'Spouse', 'Child', 'Parent', 'Other'] }
      ]
    }
  }
];
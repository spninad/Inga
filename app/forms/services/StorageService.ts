import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values'; // Import for side effects
import { v4 as uuidv4 } from 'uuid';

const FORMS_STORAGE_KEY = 'completed_forms';

export interface CompletedForm {
  id: string;
  data: Record<string, string>;
  createdAt: string;
}

export const saveForm = async (formData: Record<string, string>): Promise<void> => {
  try {
    const existingForms = await getForms();
    const newForm: CompletedForm = {
      id: uuidv4(),
      data: formData,
      createdAt: new Date().toISOString(),
    };
    const updatedForms = [...existingForms, newForm];
                await AsyncStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(updatedForms));
  } catch (error) {
    console.error('Failed to save form data:', error);
    throw new Error('Failed to save form.');
  }
};

export const getForms = async (): Promise<CompletedForm[]> => {
  try {
                const jsonValue = await AsyncStorage.getItem(FORMS_STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Failed to retrieve form data:', error);
    return [];
  }
};

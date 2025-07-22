import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = '@completed_forms';

async function saveForm(formData: Record<string, string>): Promise<void> {
  try {
    const existingForms = await getForms();
    const newForm = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      ...formData,
    };
    const updatedForms = [...existingForms, newForm];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedForms));
  } catch (error) {
    console.error('Error saving form to storage', error);
    throw error;
  }
}

async function getForms(): Promise<any[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Error getting forms from storage', error);
    return [];
  }
}

export const StorageService = {
  saveForm,
  getForms,
};

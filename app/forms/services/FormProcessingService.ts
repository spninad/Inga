import { supabase } from '../../../lib/supabaseClient.js';
import * as FileSystem from 'expo-file-system';

export interface FormField {
  fieldName: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'boolean' | 'select';
}

export const processForm = async (imageUri: string): Promise<FormField[]> => {
  try {
    // 1. Read the image file and encode it in base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 2. Format it as a data URL
    const imageDataUrl = `data:image/jpeg;base64,${base64}`;

    // 3. Call the Supabase Edge Function
    // TODO: will passing a base64 string as an image URL work properly?
    const { data, error } = await supabase.functions.invoke('process-form', {
      body: { image: imageDataUrl },
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message);
    }

    // The function returns the parsed JSON directly
    return data as FormField[];

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Error processing form:', errorMessage);
    throw new Error(`Failed to process form: ${errorMessage}`);
  }
};

import { supabase } from '../../../lib/supabaseClient.ts';
import * as FileSystem from 'expo-file-system';

export interface FormField {
  fieldName: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'boolean' | 'select';
}

export const processForm = async (imageInput: string): Promise<FormField[]> => {
  try {
    let imageDataUrl: string;

    if (imageInput.startsWith('data:image')) {
      // Already a data URL
      imageDataUrl = imageInput;
    } else if (imageInput.startsWith('http')) {
      // Remote URL - download then convert
      const localPath = `${FileSystem.cacheDirectory}form_${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(imageInput, localPath);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.deleteAsync(uri, { idempotent: true });
      imageDataUrl = `data:image/jpeg;base64,${base64}`;
    } else {
      // Assume local file path
      const base64 = await FileSystem.readAsStringAsync(imageInput, {
        encoding: FileSystem.EncodingType.Base64,
      });
      imageDataUrl = `data:image/jpeg;base64,${base64}`;
    }

    // Call the Supabase Edge Function
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

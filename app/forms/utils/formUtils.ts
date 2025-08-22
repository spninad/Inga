import { FormField } from '../services/FormProcessingService.ts';

export function parseFormFields(formFieldsString: string | undefined | string[]): FormField[] {
  if (!formFieldsString || typeof formFieldsString !== 'string') {
    return [];
  }

  try {
    const parsedData = JSON.parse(formFieldsString);
    return parsedData.fields || [];
  } catch (error) {
    console.error('Failed to parse form fields:', error);
    return [];
  }
}

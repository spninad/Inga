import { FormSchema, FilledForm } from '../types/form';
import { Document, createDocument } from './documents.service';
import { createForm } from './forms.service';

/**
 * Convert a filled form to a document for storage
 */
export async function saveFormAsDocument(
  filledForm: FilledForm, 
  formSchema: FormSchema, 
  userId: string
): Promise<Document | null> {
  try {
    // Create a visual representation of the form data
    const formDataText = generateFormDataText(filledForm, formSchema);
    
    // Convert text to a simple image representation (for now, just store as text)
    // In a real implementation, you might want to generate an actual image or PDF
    const formDataImage = await generateFormDataImage(formDataText);
    
    const documentName = `${filledForm.form_name} - ${new Date(filledForm.created_at).toLocaleDateString()}`;
    
    return await createDocument(documentName, [formDataImage], userId);
  } catch (error) {
    console.error('Error saving form as document:', error);
    return null;
  }
}

/**
 * Generate a text representation of form data
 */
function generateFormDataText(filledForm: FilledForm, formSchema: FormSchema): string {
  let text = `${formSchema.name}\n`;
  text += `Completed: ${new Date(filledForm.created_at).toLocaleDateString()}\n\n`;
  
  formSchema.fields.forEach(field => {
    const value = filledForm.data[field.id] || 'Not provided';
    text += `${field.label}: ${value}\n`;
  });
  
  return text;
}

/**
 * Convert text to a base64 data URL (simplified representation)
 * In a real implementation, this would generate an actual image or PDF
 */
async function generateFormDataImage(text: string): Promise<string> {
  // For now, create a simple text-based representation as a data URL
  // In a production app, you'd want to use a library like react-native-svg or expo-print
  // to generate an actual image or PDF
  try {
    // Convert text to base64 using btoa (available in React Native)
    const base64Text = btoa(unescape(encodeURIComponent(text)));
    return `data:text/plain;base64,${base64Text}`;
  } catch (error) {
    // Fallback if btoa is not available
    console.warn('Base64 encoding not available, using plain text');
    return `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
  }
}

/**
 * Extract form data from a document (for AI-assisted form filling)
 * This would use AI to analyze document images and extract form-relevant data
 */
export async function extractFormDataFromDocument(
  document: Document,
  formSchema: FormSchema
): Promise<Record<string, any>> {
  try {
    // Placeholder for AI extraction logic
    // In a real implementation, this would use OCR and AI to extract data from document images
    console.log('Extracting form data from document:', document.name);
    console.log('Target form schema:', formSchema.name);
    
    // For now, return empty data that user can fill manually
    const extractedData: Record<string, any> = {};
    
    // Initialize with empty values for all form fields
    formSchema.fields.forEach(field => {
      extractedData[field.id] = '';
    });
    
    return extractedData;
  } catch (error) {
    console.error('Error extracting form data from document:', error);
    return {};
  }
}

/**
 * Create a form schema from a document using AI
 * This would analyze the document and generate a form schema
 */
export async function createFormFromDocument(
  document: Document,
  userId: string
): Promise<FormSchema | null> {
  try {
    // Placeholder for AI form generation logic
    // In a real implementation, this would analyze document images to detect form fields
    console.log('Creating form from document:', document.name);
    
    // For now, create a basic form with common fields
    const basicFields = [
      { id: 'field-1', name: 'field1', type: 'text' as const, label: 'Field 1', required: false },
      { id: 'field-2', name: 'field2', type: 'text' as const, label: 'Field 2', required: false },
      { id: 'field-3', name: 'field3', type: 'textarea' as const, label: 'Additional Information', required: false }
    ];
    
    const formName = `Form from ${document.name}`;
    const description = `Auto-generated form from document: ${document.name}`;
    
    return await createForm(formName, description, basicFields, userId);
  } catch (error) {
    console.error('Error creating form from document:', error);
    return null;
  }
}
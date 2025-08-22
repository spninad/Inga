import { supabase } from './supabaseClient.ts';
import { Document } from './documents.service.ts';

export interface ExtractedField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'textarea' | 'checkbox' | 'select';
  required: boolean;
  options?: string[]; // For select fields
  placeholder?: string;
}

export interface ExtractedForm {
  id: string;
  name: string;
  description: string;
  fields: ExtractedField[];
  documentId: string;
  created_at: string;
}

/**
 * Extract form fields from document images using OpenAI vision
 */
export async function extractFormFromDocument(document: Document): Promise<ExtractedForm | null> {
  try {
    if (!document.images || document.images.length === 0) {
      throw new Error('Document has no images to analyze');
    }

    // Filter images to only include actual image MIME types (not text/plain)
    const imageUrls = document.images.filter(imageUrl => {
      if (typeof imageUrl !== 'string') return false;
      
      // Check if it's a data URL with image MIME type
      if (imageUrl.startsWith('data:image/')) {
        return true;
      }
      
      // Check if it's a regular HTTP/HTTPS URL (assume it's an image)
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return true;
      }
      
      // Skip text/plain or other non-image data URLs
      return false;
    });

    if (imageUrls.length === 0) {
      throw new Error('Document contains no image content to analyze. Please upload a document with actual images of forms.');
    }

    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('User must be authenticated');
    }

    // Prepare messages for OpenAI vision analysis
    const messages = [
      {
        role: 'system',
        content: `You are an expert form analyzer. Analyze the provided document images to determine if they contain fillable form fields.

        First, determine if the document contains a fillable form. If it does NOT contain a form (e.g., it's just text, a receipt, an article, etc.), respond with:
        {"error": "not_a_form", "message": "This document does not appear to contain a fillable form. Please upload a document with form fields such as application forms, surveys, or registration forms."}

        If the document DOES contain a fillable form, extract all form fields and return a JSON object with this exact structure:
        {
          "name": "Form title or document name",
          "description": "Brief description of the form",
          "fields": [
            {
              "id": "unique_field_id",
              "name": "field_name",
              "label": "Field Label",
              "type": "text|email|phone|number|date|textarea|checkbox|select",
              "required": true|false,
              "options": ["option1", "option2"] // only for select fields
            }
          ]
        }
        
        Field type guidelines:
        - text: general text input fields
        - email: email address fields  
        - phone: phone number fields
        - number: numeric fields
        - date: date fields
        - textarea: large text areas or multi-line fields
        - checkbox: checkboxes or yes/no fields
        - select: dropdown fields or multiple choice options
        
        Look for common form elements like:
        - Input boxes with labels
        - Checkboxes with text
        - Dropdown menus or selection lists
        - Signature fields
        - Date fields
        - Text areas for comments
        
        Respond only with valid JSON, no other text.`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Please analyze this document and determine if it contains a fillable form. If it does, extract all form fields. If not, indicate that it is not a form. Return the structured JSON format.'
          },
          ...imageUrls.map(imageUrl => ({
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          }))
        ]
      }
    ];

    // Call OpenAI vision function
    const response = await supabase.functions.invoke('openai-vision', {
      body: {
        messages,
        model: 'gpt-4o',
        max_tokens: 2000,
        temperature: 0.1 // Low temperature for consistent extraction
      }
    });

    if (response.error) {
      console.error('OpenAI vision error:', response.error);
      throw new Error(`Failed to analyze document: ${response.error.message}`);
    }

    const completion = response.data;
    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error('No response from OpenAI vision analysis');
    }

    // Parse the JSON response
    let extractedData;
    try {
      const rawContent = completion.choices[0].message.content;
      console.log('Raw OpenAI response:', rawContent);
      
      // Clean up any markdown code blocks
      const cleanedContent = rawContent.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(cleanedContent);
    } catch (_parseError) {
      console.error('Failed to parse OpenAI response:', completion.choices[0].message.content);
      throw new Error('Failed to parse form extraction results. The AI response was not in valid JSON format.');
    }

    // Check if the LLM detected that this is not a form
    if (extractedData.error === 'not_a_form') {
      throw new Error(extractedData.message || 'This document does not appear to contain a fillable form.');
    }

    // Validate and structure the extracted data
    if (!extractedData.fields || !Array.isArray(extractedData.fields)) {
      throw new Error('No fillable form fields were detected in this document. Please ensure the document contains a form with input fields, checkboxes, or selection options.');
    }

    if (extractedData.fields.length === 0) {
      throw new Error('No fillable form fields were found in this document. Please upload a document that contains form fields to fill out.');
    }

    // Create the extracted form object
    const extractedForm: ExtractedForm = {
      id: `extracted_${Date.now()}`,
      name: extractedData.name || `Form from ${document.name}`,
      description: extractedData.description || `Extracted from document: ${document.name}`,
      fields: extractedData.fields.map((field: ExtractedField, index: number) => ({
        id: field.id || `field_${index + 1}`,
        name: field.name || `field${index + 1}`,
        label: field.label || field.name || `Field ${index + 1}`,
        type: field.type || 'text',
        required: field.required || false,
        options: field.options || undefined,
        placeholder: field.placeholder || undefined
      })),
      documentId: document.id,
      created_at: new Date().toISOString()
    };

    console.log('Successfully extracted form:', extractedForm);
    return extractedForm;

  } catch (error) {
    console.error('Error extracting form from document:', error);
    throw error;
  }
}

/**
 * Save filled form data
 */
export interface FilledFormData {
  [fieldId: string]: string | boolean | number;
}

export async function saveFilledForm(
  extractedForm: ExtractedForm,
  formData: FilledFormData,
  userId: string
): Promise<boolean> {
  try {
    // Create a text representation of the filled form
    let formText = `${extractedForm.name}\n`;
    formText += `Completed: ${new Date().toLocaleDateString()}\n\n`;
    
    extractedForm.fields.forEach(field => {
      const value = formData[field.id] || 'Not provided';
      formText += `${field.label}: ${value}\n`;
    });

    const now = new Date().toISOString();

    // Save as a new document with all required fields
    const { data: _data, error } = await supabase
      .from('documents')
      .insert({
        name: `${extractedForm.name} - Completed`,
        images: [`data:text/plain;charset=utf-8,${encodeURIComponent(formText)}`],
        user_id: userId,
        created_at: now,
        updated_at: now
      });

    if (error) {
      console.error('Error saving filled form:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving filled form:', error);
    return false;
  }
}
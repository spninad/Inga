import { describe, expect, test, jest } from '@jest/globals';

// Mock types for testing
interface ExtractedField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'textarea' | 'checkbox' | 'select';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface ExtractedForm {
  id: string;
  name: string;
  description: string;
  fields: ExtractedField[];
  documentId: string;
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  images: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface FilledFormData {
  [fieldId: string]: any;
}

// Mock Supabase client
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
  },
  functions: {
    invoke: jest.fn(),
  },
  from: jest.fn(() => ({
    insert: jest.fn(),
  })),
};

// Core form extraction logic for testing
class FormExtractionService {
  static async extractFormFromDocument(document: Document, supabase: any): Promise<ExtractedForm | null> {
    try {
      if (!document.images || document.images.length === 0) {
        throw new Error('Document has no images to analyze');
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
        - select: dropdown fields or multiple choice options`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this document and determine if it contains a fillable form. If it does, extract all form fields. If not, indicate that it is not a form. Return the structured JSON format.'
            },
            ...document.images.map(imageUrl => ({
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
          temperature: 0.1
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
      } catch (parseError) {
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
        fields: extractedData.fields.map((field: any, index: number) => ({
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

  static async saveFilledForm(
    extractedForm: ExtractedForm,
    formData: FilledFormData,
    userId: string,
    supabase: any
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
      const { data, error } = await supabase
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
}

describe('Form Extraction Service Core Logic', () => {
  describe('extractFormFromDocument', () => {
    const mockDocument: Document = {
      id: 'doc-123',
      name: 'Test Document',
      images: ['data:image/jpeg;base64,/9j/4AAQ...'],
      user_id: 'user-123',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    const mockSession = {
      user: { id: 'user-123' },
      access_token: 'token',
    };

    test('should successfully extract form from document with valid response', async () => {
      const mockOpenAIResponse = {
        name: 'Application Form',
        description: 'Job application form',
        fields: [
          {
            id: 'firstName',
            name: 'firstName',
            label: 'First Name',
            type: 'text',
            required: true,
          },
          {
            id: 'email',
            name: 'email',
            label: 'Email Address',
            type: 'email',
            required: true,
          },
          {
            id: 'experience',
            name: 'experience',
            label: 'Years of Experience',
            type: 'number',
            required: false,
          },
        ],
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockOpenAIResponse),
              },
            },
          ],
        },
        error: null,
      });

      const result = await FormExtractionService.extractFormFromDocument(mockDocument, mockSupabase);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Application Form');
      expect(result?.description).toBe('Job application form');
      expect(result?.fields).toHaveLength(3);
      expect(result?.documentId).toBe('doc-123');
      expect(result?.fields[0].id).toBe('firstName');
      expect(result?.fields[0].type).toBe('text');
      expect(result?.fields[0].required).toBe(true);
    });

    test('should handle JSON with markdown code blocks', async () => {
      const mockOpenAIResponse = {
        name: 'Test Form',
        fields: [{ id: 'field1', name: 'field1', label: 'Field 1', type: 'text', required: false }],
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: `\`\`\`json\n${JSON.stringify(mockOpenAIResponse)}\n\`\`\``,
              },
            },
          ],
        },
        error: null,
      });

      const result = await FormExtractionService.extractFormFromDocument(mockDocument, mockSupabase);

      expect(result?.name).toBe('Test Form');
      expect(result?.fields).toHaveLength(1);
    });

    test('should generate default field properties when missing', async () => {
      const mockOpenAIResponse = {
        name: 'Minimal Form',
        fields: [
          { label: 'Test Field' }, // Missing id, name, type, required
          { name: 'field2', type: 'email' }, // Missing id, label, required
        ],
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockOpenAIResponse),
              },
            },
          ],
        },
        error: null,
      });

      const result = await FormExtractionService.extractFormFromDocument(mockDocument, mockSupabase);

      expect(result?.fields).toHaveLength(2);
      expect(result?.fields[0].id).toBe('field_1');
      expect(result?.fields[0].name).toBe('field1');
      expect(result?.fields[0].label).toBe('Test Field');
      expect(result?.fields[0].type).toBe('text');
      expect(result?.fields[0].required).toBe(false);

      expect(result?.fields[1].id).toBe('field_2');
      expect(result?.fields[1].label).toBe('field2');
    });

    test('should use document name in form name when AI response has no name', async () => {
      const mockOpenAIResponse = {
        fields: [{ id: 'field1', name: 'field1', label: 'Field 1', type: 'text' }],
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockOpenAIResponse),
              },
            },
          ],
        },
        error: null,
      });

      const result = await FormExtractionService.extractFormFromDocument(mockDocument, mockSupabase);

      expect(result?.name).toBe('Form from Test Document');
      expect(result?.description).toBe('Extracted from document: Test Document');
    });

    test('should throw error when document has no images', async () => {
      const documentWithoutImages = { ...mockDocument, images: [] };

      await expect(FormExtractionService.extractFormFromDocument(documentWithoutImages, mockSupabase)).rejects.toThrow(
        'Document has no images to analyze'
      );
    });

    test('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(FormExtractionService.extractFormFromDocument(mockDocument, mockSupabase)).rejects.toThrow(
        'User must be authenticated'
      );
    });

    test('should throw error when OpenAI returns not_a_form error', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  error: 'not_a_form',
                  message: 'This document does not contain a fillable form.',
                }),
              },
            },
          ],
        },
        error: null,
      });

      await expect(FormExtractionService.extractFormFromDocument(mockDocument, mockSupabase)).rejects.toThrow(
        'This document does not contain a fillable form.'
      );
    });

    test('should throw error when no fields are detected', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  name: 'Document',
                  fields: [],
                }),
              },
            },
          ],
        },
        error: null,
      });

      await expect(FormExtractionService.extractFormFromDocument(mockDocument, mockSupabase)).rejects.toThrow(
        'No fillable form fields were found in this document'
      );
    });

    test('should throw error when OpenAI response is invalid JSON', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: 'Invalid JSON response from AI',
              },
            },
          ],
        },
        error: null,
      });

      await expect(FormExtractionService.extractFormFromDocument(mockDocument, mockSupabase)).rejects.toThrow(
        'Failed to parse form extraction results'
      );
    });
  });

  describe('saveFilledForm', () => {
    const mockExtractedForm: ExtractedForm = {
      id: 'extracted_123',
      name: 'Application Form',
      description: 'Job application form',
      fields: [
        {
          id: 'firstName',
          name: 'firstName',
          label: 'First Name',
          type: 'text',
          required: true,
        },
        {
          id: 'email',
          name: 'email',
          label: 'Email Address',
          type: 'email',
          required: true,
        },
      ],
      documentId: 'doc-123',
      created_at: '2023-01-01T00:00:00Z',
    };

    const mockFormData: FilledFormData = {
      firstName: 'John Doe',
      email: 'john.doe@example.com',
    };

    test('should save filled form data successfully', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'new-doc-123' },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await FormExtractionService.saveFilledForm(mockExtractedForm, mockFormData, 'user123', mockSupabase);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('documents');
      expect(mockInsert).toHaveBeenCalledWith({
        name: 'Application Form - Completed',
        images: expect.arrayContaining([
          expect.stringMatching(/^data:text\/plain;charset=utf-8,/),
        ]),
        user_id: 'user123',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    test('should generate proper text representation of filled form', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'new-doc-123' },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      await FormExtractionService.saveFilledForm(mockExtractedForm, mockFormData, 'user123', mockSupabase);

      const insertCall = mockInsert.mock.calls[0][0];
      const encodedText = insertCall.images[0];
      const decodedText = decodeURIComponent(encodedText.replace('data:text/plain;charset=utf-8,', ''));

      expect(decodedText).toContain('Application Form');
      expect(decodedText).toContain('Completed:');
      expect(decodedText).toContain('First Name: John Doe');
      expect(decodedText).toContain('Email Address: john.doe@example.com');
    });

    test('should handle missing form data with "Not provided" placeholder', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'new-doc-123' },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const partialFormData = { firstName: 'John Doe' }; // Missing email

      await FormExtractionService.saveFilledForm(mockExtractedForm, partialFormData, 'user123', mockSupabase);

      const insertCall = mockInsert.mock.calls[0][0];
      const encodedText = insertCall.images[0];
      const decodedText = decodeURIComponent(encodedText.replace('data:text/plain;charset=utf-8,', ''));

      expect(decodedText).toContain('First Name: John Doe');
      expect(decodedText).toContain('Email Address: Not provided');
    });

    test('should return false when database insert fails', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await FormExtractionService.saveFilledForm(mockExtractedForm, mockFormData, 'user123', mockSupabase);

      expect(result).toBe(false);
    });

    test('should return false when an exception occurs', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await FormExtractionService.saveFilledForm(mockExtractedForm, mockFormData, 'user123', mockSupabase);

      expect(result).toBe(false);
    });
  });
});
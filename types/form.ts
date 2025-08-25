// Form field types
export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'address' | 'date' | 'select' | 'checkbox' | 'textarea';
  label: string;
  required?: boolean;
  placeholder?: string;
  value?: string;
  options?: string[]; // For select fields
  subfields?: FormField[];
}

// Form schema interface
export interface FormSchema {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  created_at: string;
  updated_at: string;
  user_id?: string;
  document_id?: string; // Track which document this form was created from
}

// Filled form data interface
export interface FilledForm {
  id: string;
  form_id: string;
  form_name: string;
  data: Record<string, any>; // Field values keyed by field ID
  completed: boolean;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

// Form template for common forms
export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  schema: Omit<FormSchema, 'id' | 'created_at' | 'updated_at' | 'user_id'>;
}
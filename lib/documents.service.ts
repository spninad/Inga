import { supabase } from './supabaseClient.ts';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// Interface for Document type
export interface Document {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  images: Array<{
    image: string;
    timestamp: string;
    metadata: {
      description: string;
      userId: string;
    };
  }>; // Array of JSON images
}

// Create a new document with an array of JSON images
export async function createDocument(
  name: string,
  jsonImages: Array<{
    image: string;
    timestamp: string;
    metadata: {
      description: string;
      userId: string;
    };
  }>,
  userId: string
): Promise<Document | null> {
  try {
    const documentId = uuidv4();
    const now = new Date().toISOString();

    // Insert the document with the array of JSON images
    const { data, error } = await supabase
      .from('documents') // Replace with your Supabase table name
      .insert({
        id: documentId,
        name,
        created_at: now,
        updated_at: now,
        user_id: userId,
        images: jsonImages, // Save the array of JSON images
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating document: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in createDocument:', error);
    return null;
  }
}

// Get all documents for a user
export async function getDocuments(userId: string): Promise<Document[]> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      throw new Error(`Error fetching documents: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getDocuments:', error);
    return [];
  }
}

// Get a single document by ID
export async function getDocumentById(documentId: string): Promise<Document | null> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (error) {
      throw new Error(`Error fetching document: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error in getDocumentById:', error);
    return null;
  }
}

// Update a document
export async function updateDocument(documentId: string, updates: Partial<Document>): Promise<Document | null> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error updating document: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error in updateDocument:', error);
    return null;
  }
}

// Delete a document and its images
export async function deleteDocument(documentId: string, userId: string): Promise<boolean> {
  try {
    // First get the document to access its images
    const document = await getDocumentById(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Delete images from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([`${userId}/${documentId}`]);
    
    if (storageError) {
      console.error('Error removing images:', storageError);
      // Continue with document deletion even if image deletion fails
    }
    
    // Delete the document record
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    
    if (error) {
      throw new Error(`Error deleting document: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteDocument:', error);
    return false;
  }
}
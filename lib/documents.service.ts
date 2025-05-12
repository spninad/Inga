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
  images: string[]; // Array of image URLs
}

// Create a new document with an array of JSON images
export async function createDocument(name: string, imageBase64Array: string[], userId: string): Promise<Document | null> {
  try {
    const documentId = uuidv4();
    const now = new Date().toISOString();
    
    // Upload each image to Supabase storage
    const imageUrls = await Promise.all(
      imageBase64Array.map(async (base64Image, index) => {
        const filePath = `${userId}/${documentId}/${index}.jpg`;
        
        // Convert base64 string to Uint8Array
        // This is more reliable for binary data upload
        const base64Data = base64Image.split(',')[1] || base64Image;
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Upload the binary data
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(filePath, bytes.buffer, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (error) {
          console.error('Storage error:', error);
          throw new Error(`Error uploading image: ${error.message}`);
        }
        
        // Get the public URL for the uploaded image
        const { data: publicUrl } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        
        return publicUrl.publicUrl;
      })
    );
    
    // Create document record in database
    const { data, error } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        name,
        created_at: now,
        updated_at: now,
        user_id: userId,
        images: imageUrls
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
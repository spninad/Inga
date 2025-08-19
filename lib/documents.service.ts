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
  images: string[]; // Array of base64 data URLs (data:image/jpeg;base64,...)
}

// Create a new document with an array of JSON images
export async function createDocument(name: string, imageBase64Array: string[], userId: string): Promise<Document | null> {
  try {
    const documentId = uuidv4();
    const now = new Date().toISOString();
    // Store the base64 data URLs directly in the images array
    const images = imageBase64Array;
    // Create document record in database
    const { data, error } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        name,
        created_at: now,
        updated_at: now,
        user_id: userId,
        images
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

// Delete a document and its related chats
export async function deleteDocument(documentId: string, userId: string): Promise<boolean> {
  try {
    // First, delete all chats with this documentId
    const { data: chats, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('documentId', documentId);

    if (chatError) {
      console.error('Error fetching related chats:', chatError);
      throw new Error(`Error fetching related chats: ${chatError.message}`);
    }

    if (chats && chats.length > 0) {
      const chatIds = chats.map((chat: { id: string }) => chat.id);
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .in('chat_id', chatIds);
      if (messagesError) {
        console.error('Error deleting related messages:', messagesError);
      }
    }

    // Now delete the chats themselves
    const { error: deleteChatsError } = await supabase
      .from('chats')
      .delete()
      .eq('documentId', documentId);

    if (deleteChatsError) {
      console.error('Error deleting related chats:', deleteChatsError);
      throw new Error(`Error deleting related chats: ${deleteChatsError.message}`);
    }
    console.log('Related chats deleted for document:', documentId);

    // Now delete the document itself
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Error deleting document: ${error.message}`);
    }
    return true;
  } catch (error) {
    console.error('Error in deleteDocument:', error);
    return false;
  }
}
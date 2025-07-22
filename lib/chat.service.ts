import { supabase } from './supabaseClient.ts';

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  document_id?: string;
}

export async function getChats(userId: string): Promise<Chat[]> {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching chats:', error);
    throw error;
  }
  return data || [];
}

export async function createNewChat(userId: string, title: string, documentId?: string): Promise<Chat> {
  // If we have a documentId, first check if a chat already exists for this document
  if (documentId) {
    const { data: existingChat, error: findError } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error('Error finding existing chat:', findError);
    } else if (existingChat) {
      // Return the existing chat instead of creating a new one
      return existingChat;
    }
  }

  const chatData: any = {
    user_id: userId,
    title,
  };

  // Only set document_id if documentId is provided - don't set it to null
  if (documentId) {
    chatData.document_id = documentId;
  }

  const { data, error } = await supabase
    .from('chats')
    .insert([chatData])
    .select()
    .single();

  if (error) {
    // If we get a duplicate key error and we have a documentId, try to find the existing chat
    if (error.code === '23505' && documentId) {
      console.log('Duplicate key error, attempting to find existing chat');
      const { data: existingChat, error: findError } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .eq('document_id', documentId)
        .limit(1)
        .single();

      if (findError) {
        console.error('Error finding existing chat after duplicate key error:', findError);
        throw error; // Throw original error
      }
      
      return existingChat;
    }
    
    console.error('Error creating chat:', error);
    throw error;
  }
  return data;
}
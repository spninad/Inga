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
    console.error('Error creating chat:', error);
    throw error;
  }
  return data;
}
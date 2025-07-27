import { supabase } from './supabaseClient.ts';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; [key: string]: any }>;
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  document_id?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  documentId?: string;
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
  const chatData: { user_id: string; title: string; document_id?: string } = {
    user_id: userId,
    title,
  };

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
// Function to start a new chat with a document (if provided)
export async function startDocumentChat(document?: Document): Promise<ChatSession> {
  const systemMessage: Message = {
    role: 'system',
    content: document
      ? `You are a helpful assistant analyzing document images. Help the user understand from these documents. Maintain a friendly personality, and define any key medical terms in an easy to understand way. Avoid using big words. The user will tell you their preferred language, and you should continue the conversation in that language.`
      : 'You are a helpful assistant. The user will tell you their preferred language, and you should continue the conversation in that language.',
  };

  const initialMessages: Message[] = [systemMessage];

  if (document && document.images.length > 0) {
    // Only use base64 data URLs directly
    const imageMessages = document.images.map((imageUrl: string) => ({
      type: 'image_url',
      image_url: { url: imageUrl },
    }));

    const userMessage: Message = {
      role: 'user',
      content: [
        { type: 'text', text: `I'd like to discuss this document titled "${document.name}".` },
        ...imageMessages,
      ],
    };

    initialMessages.push(userMessage);
  }

  return {
    id: Date.now().toString(),
    title: document?.name || 'New Chat',
    messages: initialMessages,
    documentId: document?.id,
  };
}

// Function to send a message to OpenAI API through Supabase function
export async function sendMessage(chatSession: ChatSession, userMessage: string, document?: Document): Promise<ChatSession> {
  try {
    // Add user message to the chat
    let updatedMessages: Message[] = [
      ...chatSession.messages,
      {
        role: 'user' as const,
        content: userMessage
      }
    ];

    // Check if this is the first user message (language preference response)
    const isFirstUserMessage = chatSession.messages.filter(msg => msg.role === 'user').length === 0;
    
    // If a document is provided, always prepend a system message about the document
    if (document) {
      let systemContent = `You are a helpful assistant analyzing document images. Help the user understand from these documents. Maintain a friendly personality, and define any key medical terms in an easy to understand way. Avoid using big words. Document title: ${document.name || ''}.`;
      
      // If this is the first user message, it's likely a language preference
      if (isFirstUserMessage) {
        systemContent += ` The user is telling you their preferred language. Acknowledge their language choice and confirm you'll continue the conversation in that language. Then ask them what they'd like to know about their document.`;
      } else {
        systemContent += ` Continue the conversation in the language the user has specified.`;
      }
      
      const systemMessage: Message = {
        role: 'system',
        content: systemContent,
      };
      // Remove any previous system messages to avoid duplicates
      updatedMessages = updatedMessages.filter((msg: any) => msg.role !== 'system');
      updatedMessages = [systemMessage, ...updatedMessages];
      // If the document has images, add them as image_url messages (as in startDocumentChat)
      if (document.images && document.images.length > 0) {
        const imageMessages = document.images.map((imageUrl: string) => ({
          type: 'image_url',
          image_url: { url: imageUrl },
        }));
        // Add the image messages to the first user message if not already present
        const firstUserMsg = updatedMessages.find((msg: any) => msg.role === 'user');
        if (firstUserMsg) {
          firstUserMsg.content = [
            { type: 'text', text: typeof firstUserMsg.content === 'string' ? firstUserMsg.content : `I'd like to discuss this document titled "${document.name}".` },
            ...imageMessages,
          ];
        }
      }
    }
    
    console.log("updatedMessages: ", updatedMessages);
    // Debug: log the messages payload and all image_url.url fields
    console.log('Payload to OpenAI:', JSON.stringify(updatedMessages, null, 2));
    updatedMessages.forEach((msg, idx) => {
      if (Array.isArray(msg.content)) {
        msg.content.forEach((item, cidx) => {
          if (item.type === 'image_url') {
            console.log(`messages[${idx}].content[${cidx}].image_url.url:`, item.image_url.url, 'type:', typeof item.image_url.url);
          }
        });
      }
    });
    // Check if any message contains images to determine which function to use
    const hasImages = updatedMessages.some(msg => 
      Array.isArray(msg.content) && 
      msg.content.some(item => item.type === 'image_url')
    );
    
    // Call the appropriate Supabase function based on content
    const functionName = hasImages ? 'openai-vision' : 'openai-proxy';
    
    // Get the current session auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User is not authenticated. Please sign in to continue.');
    }

    // Call OpenAI API through Supabase function with authentication
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {
        messages: updatedMessages,
        model: 'gpt-4o',
        max_tokens: 500,
        temperature: 0.7,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      console.error(`Supabase function error: ${JSON.stringify(error)}`);
      throw new Error(`Error calling Supabase function: ${error.message}`);
    }

    // Get the assistant's response
    const assistantMessage = data.choices?.[0]?.message;
    if (!assistantMessage) {
      throw new Error('No response from OpenAI API.');
    }

    // Add the assistant's response to the messages
    updatedMessages.push({
      role: 'assistant',
      content: assistantMessage.content || ''
    });

    // Return the updated chat session
    return {
      ...chatSession,
      messages: updatedMessages
    };
  } catch (error) {
    console.error('Error sending message:', error);
    // Add an error message to the chat
    const errorMessage: Message = {
      role: 'assistant',
      content: 'I apologize, but I encountered an error processing your request. Please try again.'
    };
    return {
      ...chatSession,
      messages: [...chatSession.messages, { role: 'user', content: userMessage }, errorMessage]
    };
  }
}
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.2';
import OpenAI from 'https://esm.sh/openai@4.52.7';
import { corsHeaders } from '../_shared/cors.ts';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { audioUri } = await req.json();

    if (!audioUri) {
      return new Response(JSON.stringify({ error: 'Missing audioUri' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Deno does not have a native 'atob' function for base64 decoding in this context.
    // The audio data is expected to be a data URI (e.g., 'data:audio/m4a;base64,...').
    // We need to extract the base64 part and convert it to a Blob.
        const base64String = audioUri.substring(audioUri.indexOf(',') + 1);
    const audioBytes = Uint8Array.from(atob(base64String), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: 'audio/m4a' });

    // Create a File-like object for the OpenAI API
    const audioFile = new File([audioBlob], "audio.m4a", { type: "audio/m4a" });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    return new Response(JSON.stringify({ transcription: transcription.text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error processing audio:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

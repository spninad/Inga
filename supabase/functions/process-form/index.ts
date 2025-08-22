import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4.11.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const formExtractionPrompt = `
Analyze the provided image of a form and extract its fields. Return the output as a valid JSON array.
Each object in the array should represent a single form field and have the following properties:
- "fieldName": A camelCase string derived from the label, to be used as a key in a database (e.g., "fullName", "emailAddress").
- "label": The human-readable label of the form field as it appears on the form (e.g., "Full Name", "Email Address").
- "type": The most appropriate input type for the field. Supported types are: "text", "email", "phone", "date", "number", "boolean" (for checkboxes), and "select" (for dropdowns or radio buttons).

Example output:
[
  { "fieldName": "fullName", "label": "Full Name", "type": "text" },
  { "fieldName": "dateOfBirth", "label": "Date of Birth", "type": "date" },
  { "fieldName": "hasInsurance", "label": "Do you have insurance?", "type": "boolean" }
]
`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Required environment variables are not set');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }

    const { image } = await req.json();
    if (!image) {
      throw new Error('Missing image in request body');
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: formExtractionPrompt },
            {
              type: 'image_url',
              image_url: { url: image }, // Expecting a base64 data URL
            },
          ],
        },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No content in OpenAI response');
    }

    return new Response(responseContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});

import { request } from 'http'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.11.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get API key from environment variables
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable not set')
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY environment variables are not set')
    }

    // Extract the JWT token from the request headers
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // Create a Supabase client to verify the JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Get the user from the JWT
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
    
    if (userError || !user) {
      throw new Error('Invalid or expired token')
    }
    
    // User is authenticated, proceed with the OpenAI request
    const userId = user.id

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    // Parse request body
    const { messages, model: requestModel, max_tokens = 500, temperature = 0.7 } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid request: messages array is required')
    }

    // Set model from request, environment variable, or default
    const model = Deno.env.get("OAI_PROXY_MODEL") || 'gpt-4o';

    if(model != requestModel){
      console.log("Request model differs from selected model. The selected model in the request will be ignored.")
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature,
    })

    // Return the response
    return new Response(JSON.stringify(completion), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }
}) 
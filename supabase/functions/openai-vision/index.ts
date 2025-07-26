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
    // Get environment variables
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables are not set')
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
    
    // Create a service role client for generating signed URLs
    const serviceClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    )

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    // Parse request body
    const { messages, model: requestModel, max_tokens = 500, temperature = 0.7 } = await req.json()

    // Set model from request, environment variable, or default
    const model = requestModel || Deno.env.get("OAI_VISION_MODEL") || 'gpt-4o';

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid request: messages array is required')
    }

    // Create a deep copy of the messages to modify image URLs
    const processedMessages = JSON.parse(JSON.stringify(messages))

    // Process messages to sign any Supabase storage URLs
    for (const message of processedMessages) {
      if (message.role === 'user' && Array.isArray(message.content)) {
        // Process content items that might contain image URLs
        for (const item of message.content) {
          if (item.type === 'image_url' && item.image_url && typeof item.image_url.url === 'string') {
            const imageUrl = item.image_url.url
            
            // Check if this is a Supabase storage URL
            if (imageUrl.includes(SUPABASE_URL) && imageUrl.includes('/storage/v1/object/public/')) {
              // Extract the path from the URL
              // Typical format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
              const urlObj = new URL(imageUrl)
              const pathParts = urlObj.pathname.split('/storage/v1/object/public/')
              
              if (pathParts.length === 2) {
                const bucketAndPath = pathParts[1]
                // First segment is bucket name, rest is file path
                const [bucket, ...pathSegments] = bucketAndPath.split('/')
                const filePath = pathSegments.join('/')
                
                // TODO: verify implementation
                // Security check: Ensure the user owns the document by checking if their user ID is in the file path.
                if (!filePath.includes(userId)) {
                  console.warn(`User ${userId} attempted to access a file they do not own: ${filePath}`);
                  // Optionally, you could return an error here or just skip signing.
                  continue; // Skip signing this URL
                }

                // Create a signed URL with service role client
                const { data: signedUrl } = await serviceClient
                  .storage
                  .from(bucket)
                  .createSignedUrl(filePath, 60 * 60) // 1 hour expiry
                
                if (signedUrl) {
                  // Replace with signed URL
                  item.image_url.url = signedUrl
                  console.log(`Signed URL created for ${filePath}`)
                }
              }
            }
          }
        }
      }
    }

    // Call OpenAI API with processed messages containing signed URLs
    const completion = await openai.chat.completions.create({
      model: model,
      messages: processedMessages,
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
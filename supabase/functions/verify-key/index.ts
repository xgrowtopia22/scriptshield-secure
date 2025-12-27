import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rate limiting map
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimit.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimit.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Input validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HWID_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const KEY_REGEX = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;

function validateScriptId(scriptId: string | null): boolean {
  return typeof scriptId === 'string' && UUID_REGEX.test(scriptId);
}

function validateHwid(hwid: string | null): boolean {
  return typeof hwid === 'string' && hwid.length >= 10 && hwid.length <= 128 && HWID_REGEX.test(hwid);
}

function validateKey(key: string | null): boolean {
  return typeof key === 'string' && KEY_REGEX.test(key);
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    'https://preview--robloxx-guard.lovable.app',
    'https://robloxx-guard.lovable.app',
    'http://localhost:5173',
    'http://localhost:8080'
  ];
  
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true'
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const scriptId = url.searchParams.get('script');
    const hwid = url.searchParams.get('hwid');
    const key = url.searchParams.get('key');

    // Validate required inputs
    if (!validateScriptId(scriptId)) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Invalid script ID format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!validateHwid(hwid)) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Invalid HWID format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Rate limiting: 10 requests per minute per IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    
    if (!checkRateLimit(clientIp, 10, 60000)) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Rate limit exceeded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    console.log(`Verify request - Script: ${scriptId}, HWID: ${hwid}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if key is provided for validation
    if (key) {
      if (!validateKey(key)) {
        return new Response(
          JSON.stringify({ valid: false, message: 'Invalid key format' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { data: keyData, error: keyError } = await supabase
        .from('hwid_keys')
        .select('*')
        .eq('script_id', scriptId)
        .eq('hwid', hwid)
        .eq('access_key', key)
        .eq('is_active', true)
        .maybeSingle();

      if (keyError) {
        console.error('Key lookup error:', keyError);
        return new Response(
          JSON.stringify({ valid: false, message: 'Database error' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      if (!keyData) {
        return new Response(
          JSON.stringify({ valid: false, message: 'Invalid key or HWID mismatch' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check expiry
      const now = new Date();
      const expiresAt = new Date(keyData.expires_at);
      
      if (now > expiresAt) {
        // Deactivate expired key
        await supabase
          .from('hwid_keys')
          .update({ is_active: false })
          .eq('id', keyData.id);

        return new Response(
          JSON.stringify({ valid: false, message: 'Key expired' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Key validated successfully');
      return new Response(
        JSON.stringify({ 
          valid: true, 
          message: 'Key valid',
          expires_at: keyData.expires_at 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if HWID has an active key for this script
    const { data: existingKey, error: existingError } = await supabase
      .from('hwid_keys')
      .select('*')
      .eq('script_id', scriptId)
      .eq('hwid', hwid)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingError) {
      console.error('Existing key lookup error:', existingError);
    }

    if (existingKey) {
      return new Response(
        JSON.stringify({ 
          valid: true, 
          message: 'Active key exists',
          key: existingKey.access_key,
          expires_at: existingKey.expires_at 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ valid: false, message: 'No valid key found. Please get a key.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ valid: false, message: 'Server error' }),
      { headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

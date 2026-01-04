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
const KEY_REGEX = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;

function validateScriptId(scriptId: string | null | undefined): boolean {
  return typeof scriptId === 'string' && UUID_REGEX.test(scriptId);
}

function validateHwid(hwid: string | null | undefined): boolean {
  // Accept any alphanumeric string between 8-256 characters (flexible for different executors)
  return typeof hwid === 'string' && hwid.length >= 8 && hwid.length <= 256 && /^[A-Za-z0-9_\-]+$/.test(hwid);
}

function validateKey(key: string | null | undefined): boolean {
  return typeof key === 'string' && KEY_REGEX.test(key);
}

// Allow all origins for Roblox executor access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const scriptId = pathParts[pathParts.length - 1];
    const hwid = url.searchParams.get('hwid');
    const key = url.searchParams.get('key');

    // Validate script ID
    if (!validateScriptId(scriptId)) {
      return new Response(
        '-- Error: Invalid script ID format',
        { headers: { ...corsHeaders, 'Content-Type': 'text/plain' }, status: 400 }
      );
    }

    // Rate limiting: 20 requests per minute per IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    
    if (!checkRateLimit(clientIp, 20, 60000)) {
      return new Response(
        '-- Error: Rate limit exceeded',
        { headers: { ...corsHeaders, 'Content-Type': 'text/plain' }, status: 429 }
      );
    }

    console.log(`Load script request - Script: ${scriptId}, HWID: ${hwid ? '[provided]' : '[none]'}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get script
    const { data: script, error: scriptError } = await supabase
      .from('scripts')
      .select('*')
      .eq('id', scriptId)
      .maybeSingle();

    if (scriptError || !script) {
      console.error('Script lookup error:', scriptError);
      return new Response(
        '-- Error: Script not found',
        { headers: { ...corsHeaders, 'Content-Type': 'text/plain' }, status: 404 }
      );
    }

    // If key system is not enabled, return obfuscated script directly
    if (!script.key_system_enabled) {
      console.log('Key system disabled, returning script');
      return new Response(
        script.obfuscated_script,
        { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } }
      );
    }

    // Validate HWID and key format when key system is enabled
    if (!validateHwid(hwid)) {
      return new Response(
        '-- Error: Invalid HWID format',
        { headers: { ...corsHeaders, 'Content-Type': 'text/plain' }, status: 400 }
      );
    }

    if (!validateKey(key)) {
      return new Response(
        '-- Error: Invalid key format',
        { headers: { ...corsHeaders, 'Content-Type': 'text/plain' }, status: 400 }
      );
    }

    // Check key validity - try exact match first, then permanent embedded
    let keyData = null;
    let keyError = null;
    
    const { data: exactMatch, error: exactError } = await supabase
      .from('hwid_keys')
      .select('*')
      .eq('script_id', scriptId)
      .eq('hwid', hwid)
      .eq('access_key', key)
      .eq('is_active', true)
      .maybeSingle();
    
    if (exactMatch) {
      keyData = exactMatch;
      keyError = exactError;
    } else {
      // Check for permanent embedded key
      const { data: permanentMatch, error: permanentError } = await supabase
        .from('hwid_keys')
        .select('*')
        .eq('script_id', scriptId)
        .eq('hwid', 'PERMANENT_EMBEDDED')
        .eq('access_key', key)
        .eq('is_active', true)
        .maybeSingle();
      
      keyData = permanentMatch;
      keyError = permanentError;
    }

    if (keyError || !keyData) {
      console.error('Key validation failed');
      return new Response(
        '-- Error: Invalid key or HWID mismatch',
        { headers: { ...corsHeaders, 'Content-Type': 'text/plain' }, status: 401 }
      );
    }

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(keyData.expires_at);
    
    if (now > expiresAt) {
      await supabase
        .from('hwid_keys')
        .update({ is_active: false })
        .eq('id', keyData.id);

      return new Response(
        '-- Error: Key expired',
        { headers: { ...corsHeaders, 'Content-Type': 'text/plain' }, status: 401 }
      );
    }

    console.log('Script loaded successfully');
    return new Response(
      script.obfuscated_script,
      { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      '-- Error: Server error',
      { headers: { ...corsHeaders, 'Content-Type': 'text/plain' }, status: 500 }
    );
  }
});

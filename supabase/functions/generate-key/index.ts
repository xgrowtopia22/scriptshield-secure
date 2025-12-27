import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rate limiting map (in-memory, resets on function cold start)
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

function validateScriptId(scriptId: string | null | undefined): boolean {
  return typeof scriptId === 'string' && UUID_REGEX.test(scriptId);
}

function validateHwid(hwid: string | null | undefined): boolean {
  return typeof hwid === 'string' && hwid.length >= 10 && hwid.length <= 128 && HWID_REGEX.test(hwid);
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

function generateAccessKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = [];
  for (let i = 0; i < 4; i++) {
    let segment = "";
    for (let j = 0; j < 5; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join("-");
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      console.error('Invalid JSON body');
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (typeof body !== 'object' || body === null) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { scriptId, hwid } = body as { scriptId?: string; hwid?: string };

    // Validate inputs
    if (!validateScriptId(scriptId)) {
      console.error('Invalid script ID format:', scriptId);
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid script ID format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!validateHwid(hwid)) {
      console.error('Invalid HWID format:', hwid);
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid HWID format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Rate limiting: 5 requests per minute per IP+HWID combination
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `${clientIp}:${hwid}`;
    
    if (!checkRateLimit(rateLimitKey, 5, 60000)) {
      console.error('Rate limit exceeded for:', rateLimitKey);
      return new Response(
        JSON.stringify({ success: false, message: 'Rate limit exceeded. Please try again later.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    console.log(`Generate key request - Script: ${scriptId}, HWID: ${hwid}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get script info for expiry settings
    const { data: script, error: scriptError } = await supabase
      .from('scripts')
      .select('*')
      .eq('id', scriptId)
      .maybeSingle();

    if (scriptError || !script) {
      console.error('Script lookup error:', scriptError);
      return new Response(
        JSON.stringify({ success: false, message: 'Script not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if HWID already has an active key
    const { data: existingKey } = await supabase
      .from('hwid_keys')
      .select('*')
      .eq('script_id', scriptId)
      .eq('hwid', hwid)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingKey) {
      console.log('Returning existing key');
      return new Response(
        JSON.stringify({ 
          success: true, 
          key: existingKey.access_key,
          expires_at: existingKey.expires_at,
          message: 'Existing key returned'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deactivate old keys for this HWID and script
    await supabase
      .from('hwid_keys')
      .update({ is_active: false })
      .eq('script_id', scriptId)
      .eq('hwid', hwid);

    // Generate new key
    const accessKey = generateAccessKey();
    
    // Calculate expiry
    const expiresAt = new Date();
    if (script.key_expiry_hours === -1) {
      // Lifetime - set to 100 years
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    } else {
      expiresAt.setHours(expiresAt.getHours() + script.key_expiry_hours);
    }

    // Insert new key
    const { data: newKey, error: insertError } = await supabase
      .from('hwid_keys')
      .insert({
        script_id: scriptId,
        hwid: hwid,
        access_key: accessKey,
        expires_at: expiresAt.toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Key insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to generate key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('New key generated successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        key: newKey.access_key,
        expires_at: newKey.expires_at,
        message: 'Key generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Server error' }),
      { headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scriptId, hwid } = await req.json();

    console.log(`Generate key request - Script: ${scriptId}, HWID: ${hwid}`);

    if (!scriptId || !hwid) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing script ID or HWID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

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
    const { data: existingKey, error: existingError } = await supabase
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
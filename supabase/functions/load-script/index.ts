import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log(`Load script request - Script: ${scriptId}, HWID: ${hwid}`);

    if (!scriptId) {
      return new Response(
        '-- Error: Script ID required',
        { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } }
      );
    }

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
        { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } }
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

    // Verify key
    if (!hwid || !key) {
      return new Response(
        '-- Error: HWID and Key required for this script',
        { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } }
      );
    }

    // Check key validity
    const { data: keyData, error: keyError } = await supabase
      .from('hwid_keys')
      .select('*')
      .eq('script_id', scriptId)
      .eq('hwid', hwid)
      .eq('access_key', key)
      .eq('is_active', true)
      .maybeSingle();

    if (keyError || !keyData) {
      console.error('Key validation failed');
      return new Response(
        '-- Error: Invalid key or HWID mismatch',
        { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } }
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
        { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } }
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
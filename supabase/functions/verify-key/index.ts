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
    const scriptId = url.searchParams.get('script');
    const hwid = url.searchParams.get('hwid');
    const key = url.searchParams.get('key');

    console.log(`Verify request - Script: ${scriptId}, HWID: ${hwid}, Key: ${key}`);

    if (!scriptId || !hwid) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Missing script ID or HWID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if key is provided for validation
    if (key) {
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
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
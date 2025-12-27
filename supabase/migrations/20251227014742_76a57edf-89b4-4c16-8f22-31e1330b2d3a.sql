-- Remove the permissive public SELECT policy on hwid_keys
-- Edge functions use service_role key and already have full access
-- All key verification goes through verify-key edge function
DROP POLICY IF EXISTS "Public can verify keys" ON public.hwid_keys;
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Service role can manage keys" ON public.hwid_keys;

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role full access" 
ON public.hwid_keys 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert keys for their own scripts
CREATE POLICY "Users can insert keys for own scripts" 
ON public.hwid_keys 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scripts 
    WHERE scripts.id = hwid_keys.script_id 
    AND scripts.user_id = auth.uid()
  )
);

-- Allow authenticated users to view keys for their own scripts
CREATE POLICY "Users can view keys for own scripts" 
ON public.hwid_keys 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scripts 
    WHERE scripts.id = hwid_keys.script_id 
    AND scripts.user_id = auth.uid()
  )
);
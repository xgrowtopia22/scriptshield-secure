-- Add user_id column to scripts table
ALTER TABLE public.scripts ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for faster queries
CREATE INDEX idx_scripts_user_id ON public.scripts(user_id);

-- Drop all permissive RLS policies on scripts table
DROP POLICY IF EXISTS "Anyone can view scripts" ON public.scripts;
DROP POLICY IF EXISTS "Anyone can create scripts" ON public.scripts;
DROP POLICY IF EXISTS "Anyone can update scripts" ON public.scripts;
DROP POLICY IF EXISTS "Anyone can delete scripts" ON public.scripts;

-- Drop all permissive RLS policies on hwid_keys table
DROP POLICY IF EXISTS "Anyone can view hwid_keys" ON public.hwid_keys;
DROP POLICY IF EXISTS "Anyone can create hwid_keys" ON public.hwid_keys;
DROP POLICY IF EXISTS "Anyone can update hwid_keys" ON public.hwid_keys;

-- Create secure RLS policies for scripts table
-- Users can only view their own scripts
CREATE POLICY "Users can view own scripts"
  ON public.scripts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only create scripts with their own user_id
CREATE POLICY "Users can create own scripts"
  ON public.scripts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own scripts
CREATE POLICY "Users can update own scripts"
  ON public.scripts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only delete their own scripts
CREATE POLICY "Users can delete own scripts"
  ON public.scripts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow service role to read scripts (for edge functions)
CREATE POLICY "Service role can read scripts"
  ON public.scripts FOR SELECT
  TO service_role
  USING (true);

-- Create secure RLS policies for hwid_keys table
-- Only service role (edge functions) can manage keys
CREATE POLICY "Service role can manage keys"
  ON public.hwid_keys FOR ALL
  TO service_role
  USING (true);

-- Public can only read keys for verification (but not insert/update/delete)
CREATE POLICY "Public can verify keys"
  ON public.hwid_keys FOR SELECT
  TO anon, authenticated
  USING (true);
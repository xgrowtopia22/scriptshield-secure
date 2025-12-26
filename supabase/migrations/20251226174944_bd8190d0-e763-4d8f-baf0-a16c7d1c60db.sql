-- Create table for storing obfuscated scripts
CREATE TABLE public.scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  original_script TEXT NOT NULL,
  obfuscated_script TEXT NOT NULL,
  loader_script TEXT NOT NULL,
  key_system_enabled BOOLEAN NOT NULL DEFAULT false,
  key_expiry_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing HWID keys
CREATE TABLE public.hwid_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  hwid TEXT NOT NULL,
  access_key TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_hwid_keys_hwid ON public.hwid_keys(hwid);
CREATE INDEX idx_hwid_keys_script_id ON public.hwid_keys(script_id);
CREATE INDEX idx_hwid_keys_access_key ON public.hwid_keys(access_key);

-- Enable Row Level Security (public access for this use case)
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hwid_keys ENABLE ROW LEVEL SECURITY;

-- Allow public read access to scripts (for loader verification)
CREATE POLICY "Anyone can view scripts" 
ON public.scripts 
FOR SELECT 
USING (true);

-- Allow public insert for scripts (simplified for demo)
CREATE POLICY "Anyone can create scripts" 
ON public.scripts 
FOR INSERT 
WITH CHECK (true);

-- Allow public update for scripts
CREATE POLICY "Anyone can update scripts" 
ON public.scripts 
FOR UPDATE 
USING (true);

-- Allow public delete for scripts
CREATE POLICY "Anyone can delete scripts" 
ON public.scripts 
FOR DELETE 
USING (true);

-- Allow public access to hwid_keys for key verification
CREATE POLICY "Anyone can view hwid_keys" 
ON public.hwid_keys 
FOR SELECT 
USING (true);

-- Allow public insert for hwid_keys (for key generation)
CREATE POLICY "Anyone can create hwid_keys" 
ON public.hwid_keys 
FOR INSERT 
WITH CHECK (true);

-- Allow public update for hwid_keys
CREATE POLICY "Anyone can update hwid_keys" 
ON public.hwid_keys 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scripts_updated_at
BEFORE UPDATE ON public.scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
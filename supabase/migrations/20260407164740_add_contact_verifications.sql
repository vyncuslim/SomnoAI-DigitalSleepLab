-- Create contact_verifications table to handle email verification for contact form
CREATE TABLE IF NOT EXISTS public.contact_verifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    subject text,
    message text,
    verification_code text NOT NULL,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '1 hour')
);

-- Enable RLS
ALTER TABLE public.contact_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (since anyone can use the contact form)
DROP POLICY IF EXISTS "Anyone can insert contact verifications" ON public.contact_verifications;
CREATE POLICY "Anyone can insert contact verifications" ON public.contact_verifications
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow admins to view all
DROP POLICY IF EXISTS "Admins can view contact verifications" ON public.contact_verifications;
CREATE POLICY "Admins can view contact verifications" ON public.contact_verifications
FOR SELECT TO authenticated
USING (public.is_admin_check(auth.uid()));

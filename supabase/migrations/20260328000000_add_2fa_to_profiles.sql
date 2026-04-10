-- Add 2FA columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_fa_enabled boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_fa_secret text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_fa_confirmed_at timestamptz;

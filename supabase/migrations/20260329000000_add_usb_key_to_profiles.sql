-- Add USB Key columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usb_key_token_hash text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usb_key_id text;

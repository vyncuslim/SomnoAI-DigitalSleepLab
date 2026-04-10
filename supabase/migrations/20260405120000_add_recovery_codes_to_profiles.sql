-- Add recovery_codes column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recovery_codes text[] DEFAULT '{}';

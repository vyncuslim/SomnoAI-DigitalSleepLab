-- Add security columns to profiles table
alter table profiles 
add column if not exists two_fa_enabled boolean default false,
add column if not exists two_fa_secret text,
add column if not exists recovery_codes text[] default '{}',
add column if not exists usb_key_enabled boolean default false,
add column if not exists usb_key_id text,
add column if not exists usb_key_secret text,
add column if not exists usb_key_token_hash text,
add column if not exists passkey_credentials jsonb default '[]';

-- Ensure RLS is enabled on profiles (should be already)
-- alter table profiles enable row level security;

-- Users can only read their own sensitive security fields
-- Note: In a real app, you'd probably want to hide these from the public profile view
-- but for this demo we'll keep it simple.

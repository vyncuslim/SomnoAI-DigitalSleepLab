
-- Ensure security schema exists

-- 1. Add 2FA columns to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_fa_enabled boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_fa_secret text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_fa_confirmed_at timestamptz;

-- 2. Add USB Key columns to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usb_key_token_hash text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usb_key_id text;

-- 3. Create user_passkeys table
CREATE TABLE IF NOT EXISTS public.user_passkeys (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    credential_id text UNIQUE NOT NULL,
    public_key text NOT NULL,
    counter bigint DEFAULT 0,
    device_type text,
    backed_up boolean DEFAULT false,
    transports text[],
    created_at timestamptz DEFAULT now(),
    last_used_at timestamptz
);

-- 4. Create auth_challenges table
CREATE TABLE IF NOT EXISTS public.auth_challenges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_challenges ENABLE ROW LEVEL SECURITY;

-- Policies for user_passkeys
DROP POLICY IF EXISTS "Users can manage own passkeys" ON public.user_passkeys;
CREATE POLICY "Users can manage own passkeys" ON public.user_passkeys
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- Policies for auth_challenges
DROP POLICY IF EXISTS "Users can manage own challenges" ON public.auth_challenges;
CREATE POLICY "Users can manage own challenges" ON public.auth_challenges
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can create login challenges" ON public.auth_challenges;
CREATE POLICY "Anyone can create login challenges" ON public.auth_challenges
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read own challenges" ON public.auth_challenges;
CREATE POLICY "Anyone can read own challenges" ON public.auth_challenges
    FOR SELECT TO anon, authenticated
    USING (true);

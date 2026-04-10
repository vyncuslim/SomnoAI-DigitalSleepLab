-- Create user_passkeys table
CREATE TABLE IF NOT EXISTS user_passkeys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  device_type TEXT,
  backed_up BOOLEAN DEFAULT FALSE,
  transports TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create auth_challenges table for WebAuthn
CREATE TABLE IF NOT EXISTS auth_challenges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_challenges ENABLE ROW LEVEL SECURITY;

-- Policies for user_passkeys
CREATE POLICY "Users can view own passkeys" ON user_passkeys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own passkeys" ON user_passkeys
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for auth_challenges (mostly used by service role, but good to have)
CREATE POLICY "Users can view own challenges" ON auth_challenges
  FOR SELECT USING (auth.uid() = user_id);

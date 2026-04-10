-- Security Enhancements SQL
-- 1. Add preferred_notification_email to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_notification_email TEXT;

-- 2. Create login_attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT FALSE,
  error_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add index for performance on login_attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created_at ON login_attempts (email, created_at DESC);

-- 4. RLS Policies for login_attempts (Admin only)
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all login attempts"
  ON login_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.is_super_owner = true)
    )
  );

-- 5. System can insert login attempts (Service Role)
-- Service role bypasses RLS by default in Supabase, but good to be explicit if needed.

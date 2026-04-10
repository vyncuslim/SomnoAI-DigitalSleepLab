-- Table for storing WebAuthn challenges
create table if not exists auth_challenges (
  id uuid default gen_random_uuid() primary key,
  challenge text not null,
  user_id uuid references auth.users(id) on delete cascade,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Index for cleanup
create index if not exists auth_challenges_expires_at_idx on auth_challenges (expires_at);

-- RLS: Only service role should access this table
alter table auth_challenges enable row level security;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS / PROFILES TABLE (Enhancement)
-- Assuming 'profiles' table already exists from Supabase Auth starter. 
-- We add columns to store the "current effective plan" for quick frontend access.
alter table profiles 
add column if not exists stripe_customer_id text,
add column if not exists subscription_id text,
add column if not exists subscription_plan text default 'free', -- 'free', 'go', 'pro', 'plus'
add column if not exists subscription_status text default 'none', -- 'active', 'trialing', 'past_due', 'canceled', etc.
add column if not exists pin_hash text,
add column if not exists has_pin_set boolean default false,
add column if not exists recovery_key_hash text,
add column if not exists failed_pin_attempts int default 0,
add column if not exists pin_blocked_until timestamp with time zone;

-- 2. SUBSCRIPTIONS TABLE (The Source of Truth)
-- Stores the full history and details of subscriptions.
create table if not exists subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  stripe_subscription_id text unique not null,
  stripe_price_id text,
  plan_name text not null, -- 'GO', 'PRO', 'PLUS'
  status text not null, -- 'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete_expired'
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. RLS POLICIES
-- Enable RLS
alter table subscriptions enable row level security;

-- Users can view their own subscriptions
drop policy if exists "Users can view own subscriptions" on subscriptions;
create policy "Users can view own subscriptions"
  on subscriptions for select
  using ( auth.uid() = user_id );

-- Service role (backend) has full access (implicit in Supabase, but good to know)

-- 4. OPTIONAL: TRIGGER TO SYNC PROFILES
-- Automatically update the 'profiles' table when a subscription changes.
-- This keeps the frontend simple (just read profiles) while keeping data normalized.

create or replace function sync_profile_plan()
returns trigger as $$
begin
  -- If the subscription is active or trialing, update the profile
  if new.status in ('active', 'trialing') then
    update profiles
    set 
      subscription_plan = new.plan_name,
      subscription_status = new.status,
      subscription_id = new.stripe_subscription_id
    where id = new.user_id;
  
  -- If the subscription is canceled or unpaid, revert to free (or handle grace period logic here)
  elsif new.status in ('canceled', 'unpaid', 'incomplete_expired') then
    update profiles
    set 
      subscription_plan = 'free',
      subscription_status = new.status,
      subscription_id = null
    where id = new.user_id;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Create the trigger
drop trigger if exists on_subscription_change on subscriptions;
create trigger on_subscription_change
  after insert or update on subscriptions
  for each row
  execute function sync_profile_plan();

create table if not exists security_researchers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  score int default 0,
  level text default 'Contributor',
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table security_researchers enable row level security;

-- Public can view researchers
drop policy if exists "Public can view researchers" on security_researchers;
create policy "Public can view researchers"
  on security_researchers for select
  using ( true );

-- Admins can manage researchers
drop policy if exists "Admins can manage researchers" on security_researchers;
create policy "Admins can manage researchers"
  on security_researchers for all
  using ( (select role from profiles where id = auth.uid()) = 'admin' );

-- 6. SECURITY & RECOGNITION TABLES
create table if not exists security_contributions (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  nickname text,
  email text,
  linkedin_url text,
  github_url text,
  contribution_type text not null, -- 'XSS', 'Injection', 'Logic', etc.
  severity text not null, -- 'Low', 'Medium', 'High', 'Critical'
  points int default 0,
  is_public boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists security_reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null,
  steps text,
  expected_result text,
  actual_result text,
  type text not null, -- 'security', 'functional', 'ai', 'ux', 'performance'
  severity text, -- 'low', 'medium', 'high', 'critical'
  status text default 'pending', -- 'pending', 'validated', 'rejected'
  ai_suggested_type text,
  ai_suggested_severity text,
  ai_confidence int,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists certificates (
  id uuid default uuid_generate_v4() primary key,
  cert_id text unique not null, -- e.g., SDSL-CERT-2026-0001
  user_id uuid references auth.users(id) on delete set null,
  recipient_name text not null,
  recipient_email text not null,
  achievement_level text not null, -- 'Top Security Contributor', 'Elite Researcher', etc.
  issue_date date default current_date,
  metadata jsonb default '{}',
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table security_contributions enable row level security;
alter table security_reports enable row level security;
alter table certificates enable row level security;

-- Public can view hall of fame
drop policy if exists "Public can view hall of fame" on security_contributions;
create policy "Public can view hall of fame"
  on security_contributions for select
  using ( is_public = true );

-- Public can verify certificates
drop policy if exists "Public can verify certificates" on certificates;
create policy "Public can verify certificates"
  on certificates for select
  using ( true );

-- Only admins can manage these
drop policy if exists "Admins can manage contributions" on security_contributions;
create policy "Admins can manage contributions"
  on security_contributions for all
  using ( (select role from profiles where id = auth.uid()) = 'admin' );

drop policy if exists "Admins can manage reports" on security_reports;
create policy "Admins can manage reports"
  on security_reports for all
  using ( (select role from profiles where id = auth.uid()) = 'admin' );

drop policy if exists "Users can view own reports" on security_reports;
create policy "Users can view own reports"
  on security_reports for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert own reports" on security_reports;
create policy "Users can insert own reports"
  on security_reports for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Admins can manage certificates" on certificates;
create policy "Admins can manage certificates"
  on certificates for all
  using ( (select role from profiles where id = auth.uid()) = 'admin' );

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null unique,
  phone text,
  full_name text not null,
  home_location text not null check (home_location in ('ROI', 'NI')),
  currency text not null check (currency in ('EUR', 'GBP')),
  created_at timestamptz not null default now()
);

-- Verification table
create table public.verification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null unique,
  id_verified boolean not null default false,
  selfie_verified boolean not null default false,
  verified_at timestamptz
);

-- Profiles table
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null unique,
  bio text,
  university text,
  travel_preferences jsonb default '{}',
  nominated_contact jsonb default '{}'
);

-- Row Level Security
alter table public.users enable row level security;
alter table public.verification enable row level security;
alter table public.profiles enable row level security;

-- RLS Policies: users can only read and update their own data
create policy "Users can view own record" on public.users for select using (auth.uid() = id);
create policy "Users can update own record" on public.users for update using (auth.uid() = id);
create policy "Users can insert own record" on public.users for insert with check (auth.uid() = id);

create policy "Users can view own verification" on public.verification for select using (auth.uid() = user_id);
create policy "Users can insert own verification" on public.verification for insert with check (auth.uid() = user_id);

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = user_id);

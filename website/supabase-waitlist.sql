-- HTWA Waitlist Table
-- Run this SQL in the Supabase SQL editor at supabase.com/dashboard.
-- Navigate to: Project → SQL Editor → New query → paste and run.

create table if not exists waitlist (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  email       text        not null unique,
  university  text        not null,
  region      text        not null check (region in ('ROI', 'NI')),
  created_at  timestamptz not null default now()
);

-- Index for fast email lookups and duplicate prevention
create index if not exists waitlist_email_idx on waitlist (email);

-- Row Level Security: allow anonymous inserts (form submissions), block reads
alter table waitlist enable row level security;

-- Allow the website form (anon key) to insert
create policy "Allow anon insert" on waitlist
  for insert
  to anon
  with check (true);

-- Only authenticated users (admin dashboard) can read the list
create policy "Allow auth read" on waitlist
  for select
  to authenticated
  using (true);

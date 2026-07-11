-- SafeBridge Japan — Database Schema (Supabase / Postgres)
-- Run this in Supabase: Project → SQL Editor → New Query → paste all → Run

-- ============ PROFILES ============
-- One row per registered user, linked to Supabase's built-in auth.users
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  preferred_language text default 'en',
  home_lat double precision,
  home_lng double precision,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, preferred_language)
  values (new.id, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'preferred_language','en'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ SHELTERS ============
create table if not exists shelters (
  id bigint generated always as identity primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  address text,
  capacity int
);

alter table shelters enable row level security;
create policy "Anyone can view shelters"
  on shelters for select using (true);

-- Seed demo shelters around Beppu / APU (real coordinates, for demo realism)
insert into shelters (name, lat, lng, address, capacity) values
  ('APU Millennium Hall', 33.2797, 131.5011, 'Ritsumeikan Asia Pacific University, Beppu', 500),
  ('Beppu City Gymnasium', 33.2846, 131.4914, 'Beppu, Oita', 800),
  ('Kamegawa Elementary School', 33.2977, 131.4877, 'Kamegawa, Beppu', 300),
  ('Beppu Civic Hall Shelter Zone', 33.2758, 131.4954, 'Beppu, Oita', 250)
on conflict do nothing;

-- ============ ALERTS ============
-- is_demo is always true here since this app has no real J-Alert/JMA feed.
-- The "Simulate Alert" button in the app inserts rows here to demonstrate
-- the realtime push pipeline working end-to-end.
create table if not exists alerts (
  id bigint generated always as identity primary key,
  title_en text not null,
  title_ja text,
  title_pt text,
  title_zh text,
  title_vi text,
  message_en text not null,
  message_ja text,
  message_pt text,
  message_zh text,
  message_vi text,
  severity text default 'warning', -- info | warning | severe
  is_demo boolean default true,
  created_at timestamptz default now()
);

alter table alerts enable row level security;
create policy "Anyone can view alerts"
  on alerts for select using (true);
create policy "Authenticated users can create demo alerts"
  on alerts for insert to authenticated with check (true);

-- Enable realtime so the app gets a live push the instant a row is inserted
alter publication supabase_realtime add table alerts;

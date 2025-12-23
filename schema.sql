-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles: Extends auth.users
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text,
  avatar_url text,
  veto_count_reset_date timestamp with time zone default now(),
  weekly_veto_used boolean default false
);

-- Restaurants: The menu
create table public.restaurants (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  cuisine_type text,
  google_maps_link text,
  added_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

-- Votes: Daily reset implicitly by date filtering
create table public.votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  restaurant_id uuid references public.restaurants(id) not null,
  vote_date date default current_date,
  created_at timestamp with time zone default now(),
  unique(user_id, vote_date) -- One vote per user per day
);

-- Vetos: The fun mechanic
create table public.vetos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  restaurant_id uuid references public.restaurants(id) not null,
  veto_date date default current_date,
  created_at timestamp with time zone default now()
);

-- Row Level Security (RLS) - Basic Policy
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.votes enable row level security;
alter table public.vetos enable row level security;

-- Policies (Open for now for demo simplicity, but should be authenticated in prod)
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);

create policy "Restaurants are viewable by everyone." on public.restaurants for select using (true);
create policy "Authenticated users can insert restaurants." on public.restaurants for insert with check (auth.role() = 'authenticated');

create policy "Votes are viewable by everyone." on public.votes for select using (true);
create policy "Authenticated users can insert votes." on public.votes for insert with check (auth.role() = 'authenticated');

create policy "Vetos are viewable by everyone." on public.vetos for select using (true);
create policy "Authenticated users can insert vetos." on public.vetos for insert with check (auth.role() = 'authenticated');

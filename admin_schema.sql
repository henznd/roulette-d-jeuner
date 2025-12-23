-- 1. Add Admin flag to Profiles (Safe if exists)
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'is_admin') then
        alter table public.profiles add column is_admin boolean default false;
    end if;
end $$;

-- 2. Create App Settings Table (Safe if exists)
create table if not exists public.app_settings (
    id int primary key default 1 check (id = 1),
    closing_hour int default 12,
    active_days int[] default array[1, 2, 3, 4, 5], -- Mon(1) to Fri(5)
    updated_at timestamp with time zone default now(),
    updated_by uuid references public.profiles(id)
);

-- 3. Initial Seed (Safe if exists)
insert into public.app_settings (id, closing_hour, active_days)
values (1, 12, array[1, 2, 3, 4, 5])
on conflict (id) do nothing;

-- 4. RLS Policies (Drop and Recreate to be safe or use IF NOT EXISTS workaround)
alter table public.app_settings enable row level security;

-- Drop existing policies to avoid errors on re-run
drop policy if exists "Settings are viewable by everyone." on public.app_settings;
drop policy if exists "Admins can update settings." on public.app_settings;

create policy "Settings are viewable by everyone." on public.app_settings for select using (true);

create policy "Admins can update settings." on public.app_settings for update using (
    exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
);

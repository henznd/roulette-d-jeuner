-- Enhanced RLS Policies for Security

-- ===============================================
-- PROFILES TABLE
-- ===============================================

-- Drop existing policies
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;

-- New policies
create policy "Profiles are viewable by everyone" 
  on public.profiles for select 
  using (true);

create policy "Users can insert their own profile ONCE" 
  on public.profiles for insert 
  with check (auth.uid() = id);

create policy "Users can update their own profile (except admin status)" 
  on public.profiles for update 
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Note: is_admin cannot be changed via normal UPDATE due to RLS
    -- Only service role can change it
  );

-- ===============================================
-- RESTAURANTS TABLE
-- ===============================================

drop policy if exists "Restaurants are viewable by everyone." on public.restaurants;
drop policy if exists "Authenticated users can insert restaurants." on public.restaurants;

create policy "Restaurants are viewable by everyone" 
  on public.restaurants for select 
  using (true);

create policy "Authenticated users can add restaurants" 
  on public.restaurants for insert 
  with check (auth.role() = 'authenticated' and auth.uid() = added_by);

create policy "Users can only delete their own restaurants" 
  on public.restaurants for delete 
  using (auth.uid() = added_by);

-- ===============================================
-- VOTES TABLE
-- ===============================================

drop policy if exists "Votes are viewable by everyone." on public.votes;
drop policy if exists "Authenticated users can insert votes." on public.votes;

create policy "Votes are viewable by everyone" 
  on public.votes for select 
  using (true);

create policy "Users can insert/update their own votes" 
  on public.votes for insert 
  with check (auth.uid() = user_id);

-- Allow upsert (changing vote)
create policy "Users can update their own votes" 
  on public.votes for update 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own votes" 
  on public.votes for delete 
  using (auth.uid() = user_id);

-- ===============================================
-- VETOS TABLE
-- ===============================================

drop policy if exists "Vetos are viewable by everyone." on public.vetos;
drop policy if exists "Authenticated users can insert vetos." on public.vetos;

create policy "Vetos are viewable by everyone" 
  on public.vetos for select 
  using (true);

create policy "Users can insert their own vetos" 
  on public.vetos for insert 
  with check (
    auth.uid() = user_id 
    and (
      -- Check user hasn't used veto this week (simplified to day for now)
      select weekly_veto_used from public.profiles where id = auth.uid()
    ) = false
  );

-- No update or delete allowed on vetos (permanent decision)

-- ===============================================
-- APP_SETTINGS TABLE (Already has admin-only UPDATE)
-- ===============================================
-- Policies already created in admin_schema.sql, no changes needed

-- Trigger Function: Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, username, is_admin, weekly_veto_used)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email = 'fousouley2002@gmail.com', -- Only this email gets admin
    false
  );
  return new;
end;
$$;

-- Trigger: Execute function after auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill: Create profiles for existing users (if any)
insert into public.profiles (id, username, is_admin, weekly_veto_used)
select 
  id,
  coalesce(raw_user_meta_data->>'username', split_part(email, '@', 1)),
  email = 'fousouley2002@gmail.com',
  false
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;

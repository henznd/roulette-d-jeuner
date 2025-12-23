-- Trigger Function: Auto-create profile when user signs up (v2.0 multi-teams)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, username, team_id, is_team_admin, double_vote_available, last_banishment_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    null,  -- Team sera assignée plus tard via create-team ou join-team
    false, -- Pas admin par défaut
    true,  -- Double vote disponible au début
    null   -- Pas de banissement initial
  );
  return new;
end;
$$;

-- Trigger: Execute function after auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Note: Ce trigger crée le profil SANS team_id
-- L'utilisateur doit ensuite aller sur /create-team ou /join-team
-- pour assigner son team_id

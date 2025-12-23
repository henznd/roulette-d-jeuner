-- Trigger pour reset mensuel du double vote
CREATE OR REPLACE FUNCTION reset_monthly_double_votes()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET double_vote_available = true
  WHERE EXTRACT(DAY FROM NOW()) = 1;  -- 1er du mois
END;
$$ LANGUAGE plpgsql;

-- Option 1: Cron job (nécessite pg_cron extension)
-- SELECT cron.schedule('reset-double-votes', '0 0 1 * *', 'SELECT reset_monthly_double_votes()');

-- Option 2: Trigger lors de login (plus simple, pas besoin d'extension)
CREATE OR REPLACE FUNCTION check_monthly_double_vote_reset()
RETURNS TRIGGER AS $$
BEGIN
  -- Si on est le 1er du mois et que le double vote n'est pas disponible, le réinitialiser
  IF EXTRACT(DAY FROM NOW()) = 1 AND NEW.double_vote_available = false THEN
    NEW.double_vote_available := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS monthly_double_vote_reset ON public.profiles;
CREATE TRIGGER monthly_double_vote_reset
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_monthly_double_vote_reset();

SELECT 'Trigger double vote reset créé !' AS status;

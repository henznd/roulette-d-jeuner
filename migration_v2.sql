-- ===============================================
-- LUNCHSQUAD V2.0 - MIGRATION MULTI-TEAMS
-- ===============================================
-- À exécuter dans Supabase SQL Editor

-- 1. CRÉER TABLE TEAMS
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(8) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index pour recherche rapide par code
CREATE INDEX IF NOT EXISTS teams_code_idx ON public.teams(code);

-- 2. MODIFIER TABLE PROFILES
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id),
  ADD COLUMN IF NOT EXISTS is_team_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS double_vote_available BOOLEAN DEFAULT TRUE;

-- Index pour recherche par username
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_team_idx ON public.profiles(team_id);

-- Contrainte NOT NULL pour username (après migration)
-- ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;

-- 3. MODIFIER TABLE RESTAURANTS
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id),
  ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS restaurants_team_idx ON public.restaurants(team_id);

-- 4. MODIFIER TABLE VOTES
ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS is_double BOOLEAN DEFAULT FALSE;

-- 5. MODIFIER TABLE BANISHMENTS  
ALTER TABLE public.banishments
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

CREATE INDEX IF NOT EXISTS banishments_team_idx ON public.banishments(team_id);

-- 6. CRÉER TABLE PUNCHLINES
CREATE TABLE IF NOT EXISTS public.punchlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  text TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS punchlines_team_idx ON public.punchlines(team_id);
CREATE INDEX IF NOT EXISTS punchlines_date_idx ON public.punchlines(date);

-- 7. CRÉER TABLE RESTAURANT_RATINGS
CREATE TABLE IF NOT EXISTS public.restaurant_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, user_id)
);

-- 8. FONCTION: Générer code team unique
CREATE OR REPLACE FUNCTION generate_team_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Éviter confusion 0/O, 1/I
  result VARCHAR := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 9. FONCTION: Mettre à jour rating restaurant
CREATE OR REPLACE FUNCTION update_restaurant_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.restaurants
  SET 
    rating = (
      SELECT AVG(rating)::FLOAT 
      FROM public.restaurant_ratings 
      WHERE restaurant_id = NEW.restaurant_id
    ),
    rating_count = (
      SELECT COUNT(*) 
      FROM public.restaurant_ratings 
      WHERE restaurant_id = NEW.restaurant_id
    )
  WHERE id = NEW.restaurant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour auto-update rating
DROP TRIGGER IF EXISTS rating_update_trigger ON public.restaurant_ratings;
CREATE TRIGGER rating_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.restaurant_ratings
  FOR EACH ROW EXECUTE FUNCTION update_restaurant_rating();

-- 10. RLS POLICIES - TEAMS

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les teams (pour rejoindre)
CREATE POLICY "Teams viewable by all authenticated" 
  ON public.teams FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Seuls les authentifiés peuvent créer une team
CREATE POLICY "Users can create teams" 
  ON public.teams FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Seul le créateur peut update/delete
CREATE POLICY "Only creator can modify team" 
  ON public.teams FOR UPDATE 
  USING (created_by = auth.uid());

CREATE POLICY "Only creator can delete team" 
  ON public.teams FOR DELETE 
  USING (created_by = auth.uid());

-- 11. RLS POLICIES - RESTAURANTS (Isolation par team)

DROP POLICY IF EXISTS "Restaurants are viewable by everyone" ON public.restaurants;
DROP POLICY IF EXISTS "Only admins can add restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Only admins can update restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Only admins can delete restaurants" ON public.restaurants;

CREATE POLICY "Users can view their team's restaurants" 
  ON public.restaurants FOR SELECT 
  USING (
    team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team admins can add restaurants" 
  ON public.restaurants FOR INSERT 
  WITH CHECK (
    team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    AND (
      SELECT is_team_admin FROM public.profiles WHERE id = auth.uid()
    ) = true
  );

CREATE POLICY "Team admins can update restaurants" 
  ON public.restaurants FOR UPDATE 
  USING (
    team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    AND (
      SELECT is_team_admin FROM public.profiles WHERE id = auth.uid()
    ) = true
  );

CREATE POLICY "Team admins can delete restaurants" 
  ON public.restaurants FOR DELETE 
  USING (
    team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    AND (
      SELECT is_team_admin FROM public.profiles WHERE id = auth.uid()
    ) = true
  );

-- 12. RLS POLICIES - VOTES (Isolation par team)

DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.votes;
DROP POLICY IF EXISTS "Users can insert/update their own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.votes;

CREATE POLICY "Users can view their team's votes" 
  ON public.votes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r 
      WHERE r.id = votes.restaurant_id 
      AND r.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert votes for their team" 
  ON public.votes FOR INSERT 
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.restaurants r 
      WHERE r.id = restaurant_id 
      AND r.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own votes" 
  ON public.votes FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own votes" 
  ON public.votes FOR DELETE 
  USING (user_id = auth.uid());

-- 13. RLS POLICIES - BANISHMENTS (Isolation par team)

DROP POLICY IF EXISTS "Banishments are viewable by everyone" ON public.banishments;
DROP POLICY IF EXISTS "Users can banish once per month" ON public.banishments;

CREATE POLICY "Users can view their team's banishments" 
  ON public.banishments FOR SELECT 
  USING (
    team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can banish in their team once per month" 
  ON public.banishments FOR INSERT 
  WITH CHECK (
    user_id = auth.uid()
    AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    AND (
      SELECT last_banishment_date IS NULL 
        OR EXTRACT(MONTH FROM last_banishment_date) != EXTRACT(MONTH FROM CURRENT_DATE)
        OR EXTRACT(YEAR FROM last_banishment_date) != EXTRACT(YEAR FROM CURRENT_DATE)
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- 14. RLS POLICIES - PUNCHLINES

ALTER TABLE public.punchlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team's punchlines" 
  ON public.punchlines FOR SELECT 
  USING (
    team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can add punchlines to their team" 
  ON public.punchlines FOR INSERT 
  WITH CHECK (
    user_id = auth.uid()
    AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team admins can delete punchlines" 
  ON public.punchlines FOR DELETE 
  USING (
    team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    AND (
      SELECT is_team_admin FROM public.profiles WHERE id = auth.uid()
    ) = true
  );

-- 15. RLS POLICIES - RESTAURANT_RATINGS

ALTER TABLE public.restaurant_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings" 
  ON public.restaurant_ratings FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r 
      WHERE r.id = restaurant_id 
      AND r.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can rate restaurants" 
  ON public.restaurant_ratings FOR INSERT 
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.restaurants r 
      WHERE r.id = restaurant_id 
      AND r.team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own ratings" 
  ON public.restaurant_ratings FOR UPDATE 
  USING (user_id = auth.uid());

-- Vérifications
SELECT 'Migration v2.0 terminée !' AS status;
SELECT COUNT(*) AS teams_count FROM public.teams;
SELECT COUNT(*) AS profiles_with_username FROM public.profiles WHERE username IS NOT NULL;

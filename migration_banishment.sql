-- ===============================================
-- MIGRATION: VÉTO → BANISSEMENT MENSUEL
-- ===============================================

-- 1. SUPPRIMER TOUS LES RESTAURANTS EXISTANTS
TRUNCATE TABLE public.restaurants CASCADE;
-- Cela supprime aussi votes et vetos liés via CASCADE

-- 2. RENOMMER LA TABLE VETOS → BANISHMENTS
ALTER TABLE public.vetos RENAME TO banishments;

-- Renommer la colonne si elle existe
ALTER TABLE public.banishments 
  RENAME COLUMN veto_date TO banishment_date;

-- 3. MODIFIER LA TABLE PROFILES
-- Supprimer les anciennes colonnes "véto hebdomadaire"
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS weekly_veto_used,
  DROP COLUMN IF EXISTS veto_count_reset_date;

-- Ajouter nouvelle colonne pour tracking mensuel
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS last_banishment_date DATE;

-- 4. METTRE À JOUR LES RLS POLICIES

-- ===============================================
-- RESTAURANTS: Admin seulement
-- ===============================================

-- Drop anciennes policies
DROP POLICY IF EXISTS "Restaurants are viewable by everyone" ON public.restaurants;
DROP POLICY IF EXISTS "Authenticated users can add restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Users can only delete their own restaurants" ON public.restaurants;

-- Nouvelles policies: ADMIN SEULEMENT
CREATE POLICY "Restaurants are viewable by everyone" 
  ON public.restaurants FOR SELECT 
  USING (true);

CREATE POLICY "Only admins can add restaurants" 
  ON public.restaurants FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update restaurants" 
  ON public.restaurants FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete restaurants" 
  ON public.restaurants FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ===============================================
-- BANISHMENTS: Nouvelles policies
-- ===============================================

-- Drop anciennes policies vetos
DROP POLICY IF EXISTS "Vetos are viewable by everyone" ON public.banishments;
DROP POLICY IF EXISTS "Users can insert their own vetos" ON public.banishments;

-- Nouvelles policies banishments
CREATE POLICY "Banishments are viewable by everyone" 
  ON public.banishments FOR SELECT 
  USING (true);

CREATE POLICY "Users can banish once per month" 
  ON public.banishments FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND (
      -- Vérifier que l'utilisateur n'a pas déjà banni ce mois
      SELECT last_banishment_date IS NULL 
        OR EXTRACT(MONTH FROM last_banishment_date) != EXTRACT(MONTH FROM CURRENT_DATE)
        OR EXTRACT(YEAR FROM last_banishment_date) != EXTRACT(YEAR FROM CURRENT_DATE)
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Pas d'UPDATE ou DELETE sur les banishments (décision permanente pour la journée)

-- ===============================================
-- TRIGGER: Mettre à jour last_banishment_date
-- ===============================================

CREATE OR REPLACE FUNCTION public.update_last_banishment_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_banishment_date = NEW.banishment_date
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_banishment_insert ON public.banishments;
CREATE TRIGGER on_banishment_insert
  AFTER INSERT ON public.banishments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_banishment_date();

-- ===============================================
-- MISE À JOUR DU TRIGGER AUTO-PROFILE
-- ===============================================

-- Re-créer le trigger avec les bons champs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_admin, last_banishment_date)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
    new.email = 'fousouley2002@gmail.com',
    NULL
  );
  RETURN new;
END;
$$;

-- ===============================================
-- NETTOYAGE: Mettre à jour les profils existants
-- ===============================================

-- Retirer weekly_veto_used pour les profils existants (si pas déjà fait par ALTER TABLE)
-- et initialiser last_banishment_date à NULL
UPDATE public.profiles 
SET last_banishment_date = NULL
WHERE last_banishment_date IS NULL;

-- ===============================================
-- FIN DE LA MIGRATION
-- ===============================================

-- Vérifications
SELECT 'Migration terminée. Vérifications:' AS status;
SELECT COUNT(*) AS restaurants_count FROM public.restaurants; -- Devrait être 0
SELECT COUNT(*) AS banishments_count FROM public.banishments; -- Devrait être 0 ou très peu
SELECT id, username, is_admin, last_banishment_date FROM public.profiles; -- Vérifier structure

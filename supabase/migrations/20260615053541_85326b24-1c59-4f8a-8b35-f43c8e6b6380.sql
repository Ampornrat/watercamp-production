
-- Lock down institute_participations: remove public read/insert; admins keep full access
DROP POLICY IF EXISTS "Anyone views participation" ON public.institute_participations;
DROP POLICY IF EXISTS "Anyone creates participation" ON public.institute_participations;

-- Safe read helper that returns ONLY the id of the latest 'join' participation (no consent fields)
CREATE OR REPLACE FUNCTION public.get_institute_join_participation_id(_institute_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.institute_participations
  WHERE institute_id = _institute_id
    AND status = 'join'
  ORDER BY created_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_institute_join_participation_id(uuid) TO anon, authenticated;

-- Lock down guest registrations: remove the open INSERT policy.
-- Authenticated users keep "Users create own registrations" (auth.uid() = user_id).
-- Guest sign-ups must now go through a validated server function (supabaseAdmin).
DROP POLICY IF EXISTS "Guests create registrations" ON public.registrations;

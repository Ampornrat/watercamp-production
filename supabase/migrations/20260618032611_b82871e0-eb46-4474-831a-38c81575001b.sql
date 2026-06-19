
CREATE OR REPLACE FUNCTION public.public_registrations_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) FROM public.registrations;
$$;

GRANT EXECUTE ON FUNCTION public.public_registrations_count() TO anon, authenticated;

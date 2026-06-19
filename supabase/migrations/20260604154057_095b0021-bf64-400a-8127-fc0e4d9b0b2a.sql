-- Update handle_new_user to assign role based on signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta_role text;
  resolved_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, organization, position, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'organization',
    NEW.raw_user_meta_data->>'position',
    NEW.raw_user_meta_data->>'phone'
  );

  meta_role := lower(coalesce(NEW.raw_user_meta_data->>'role', ''));
  resolved_role := CASE
    WHEN meta_role = 'advisor' THEN 'advisor'::public.app_role
    WHEN meta_role = 'student' THEN 'student'::public.app_role
    ELSE 'user'::public.app_role
  END;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, resolved_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Backfill advisor roles for users linked in advisors table
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT a.user_id, 'advisor'::public.app_role
FROM public.advisors a
WHERE a.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill student roles for users who have registrations
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT r.user_id, 'student'::public.app_role
FROM public.registrations r
WHERE r.user_id IS NOT NULL
ON CONFLICT DO NOTHING;
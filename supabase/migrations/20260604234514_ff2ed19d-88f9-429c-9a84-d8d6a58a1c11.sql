
-- ============================================================
-- ADVISORS: tighten access
-- ============================================================
DROP POLICY IF EXISTS "Anyone views advisors" ON public.advisors;
DROP POLICY IF EXISTS "Anyone creates advisor" ON public.advisors;

CREATE OR REPLACE FUNCTION public.current_advisor_institute_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institute_id
  FROM public.advisors
  WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.current_advisor_institute_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_advisor_institute_id() TO authenticated, service_role;

CREATE POLICY "Advisors read same-institute advisors" ON public.advisors
  FOR SELECT TO authenticated
  USING (
    institute_id = public.current_advisor_institute_id()
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Public helper used by the advisor registration page (returns boolean only).
CREATE OR REPLACE FUNCTION public.institute_has_main_advisor(_institute_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.advisors
    WHERE institute_id = _institute_id AND role = 'main'
  )
$$;
GRANT EXECUTE ON FUNCTION public.institute_has_main_advisor(uuid) TO anon, authenticated, service_role;

-- ============================================================
-- CONTEST tables: admin-only direct access; client uses server fns
-- ============================================================
DROP POLICY IF EXISTS "Anyone views teams" ON public.contest_teams;
DROP POLICY IF EXISTS "Anyone creates teams" ON public.contest_teams;
DROP POLICY IF EXISTS "Anyone views members" ON public.contest_team_members;
DROP POLICY IF EXISTS "Anyone creates members" ON public.contest_team_members;
DROP POLICY IF EXISTS "Anyone views submissions" ON public.contest_submissions;
DROP POLICY IF EXISTS "Anyone creates submissions" ON public.contest_submissions;

-- ============================================================
-- SURVEY tables: drop public RLS; reads/writes via token-validating server fns
-- ============================================================
DROP POLICY IF EXISTS "Anyone reads survey by token" ON public.survey_responses;
DROP POLICY IF EXISTS "Anyone submits survey response" ON public.survey_responses;
DROP POLICY IF EXISTS "Anyone reads invitation by token" ON public.survey_invitations;
DROP POLICY IF EXISTS "Anyone submits invitation" ON public.survey_invitations;
DROP POLICY IF EXISTS "Anyone reads answers" ON public.survey_answers;
DROP POLICY IF EXISTS "Anyone inserts answers" ON public.survey_answers;

-- ============================================================
-- STORAGE: contest-submissions bucket
-- ============================================================
DROP POLICY IF EXISTS "Anyone reads contest files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone uploads contest files" ON storage.objects;

CREATE POLICY "Admins read contest files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contest-submissions' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- CAPACITY enforcement + guest duplicate prevention
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_training_capacity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cap int;
  current_count int;
BEGIN
  SELECT capacity INTO cap FROM public.trainings WHERE id = NEW.training_id;
  IF cap IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO current_count FROM public.registrations WHERE training_id = NEW.training_id;
  IF current_count >= cap THEN
    RAISE EXCEPTION 'หลักสูตรเต็มแล้ว ไม่สามารถลงทะเบียนเพิ่มได้' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_training_capacity ON public.registrations;
CREATE TRIGGER trg_check_training_capacity
  BEFORE INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.check_training_capacity();

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_guest_registration
  ON public.registrations (training_id, lower(guest_email))
  WHERE user_id IS NULL AND guest_email IS NOT NULL;

-- ============================================================
-- Lock down SECURITY DEFINER + set search_path on pgmq wrappers
-- ============================================================
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- Restrict role-check helpers to authenticated callers (used in RLS)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_completed_training(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_completed_any_core(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_registered_training(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_registered_any_core(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.advisor_can_handle_registration(text, uuid) FROM anon;

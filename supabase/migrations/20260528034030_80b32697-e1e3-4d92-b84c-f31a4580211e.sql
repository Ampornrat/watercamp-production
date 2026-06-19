
-- 1. course_type enum + columns
DO $$ BEGIN
  CREATE TYPE public.course_type AS ENUM ('core', 'elective');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS course_type public.course_type NOT NULL DEFAULT 'elective',
  ADD COLUMN IF NOT EXISTS prerequisite_training_id UUID REFERENCES public.trainings(id) ON DELETE SET NULL;

-- 2. completion_status on registrations
DO $$ BEGIN
  CREATE TYPE public.completion_status AS ENUM ('enrolled', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS completion_status public.completion_status NOT NULL DEFAULT 'enrolled';

-- 3. helper: did user complete a specific training
CREATE OR REPLACE FUNCTION public.has_completed_training(_user_id uuid, _training_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.registrations
    WHERE user_id = _user_id
      AND training_id = _training_id
      AND completion_status = 'completed'
  );
$$;

-- 4. helper: did user complete ANY core training
CREATE OR REPLACE FUNCTION public.has_completed_any_core(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.registrations r
    JOIN public.trainings t ON t.id = r.training_id
    WHERE r.user_id = _user_id
      AND r.completion_status = 'completed'
      AND t.course_type = 'core'
  );
$$;

-- 5. enforcement trigger
CREATE OR REPLACE FUNCTION public.enforce_prerequisite_on_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t_type public.course_type;
  prereq UUID;
  prereq_title TEXT;
BEGIN
  SELECT course_type, prerequisite_training_id
    INTO t_type, prereq
  FROM public.trainings WHERE id = NEW.training_id;

  -- core หรือ guest (ไม่มี user_id) → ผ่าน
  IF t_type = 'core' OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- elective + มี prerequisite เจาะจง
  IF prereq IS NOT NULL THEN
    IF NOT public.has_completed_training(NEW.user_id, prereq) THEN
      SELECT title INTO prereq_title FROM public.trainings WHERE id = prereq;
      RAISE EXCEPTION 'ต้องผ่านหลักสูตรหลัก "%": ก่อนลงทะเบียนหลักสูตรนี้', prereq_title
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  -- elective + ไม่ระบุ prerequisite → ต้องผ่าน core อย่างน้อย 1 หลักสูตร
  IF NOT public.has_completed_any_core(NEW.user_id) THEN
    RAISE EXCEPTION 'ต้องผ่านหลักสูตรหลักอย่างน้อย 1 หลักสูตร ก่อนลงทะเบียนหลักสูตรเสริมทักษะ'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_prerequisite ON public.registrations;
CREATE TRIGGER trg_enforce_prerequisite
  BEFORE INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_prerequisite_on_registration();

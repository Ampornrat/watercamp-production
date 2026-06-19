
-- ฟังก์ชันใหม่: ตรวจสอบว่าได้ลงทะเบียนหลักสูตรนั้นแล้วหรือไม่ (ทุกสถานะ)
CREATE OR REPLACE FUNCTION public.has_registered_training(_user_id uuid, _training_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.registrations
    WHERE user_id = _user_id AND training_id = _training_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_registered_any_core(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.registrations r
    JOIN public.trainings t ON t.id = r.training_id
    WHERE r.user_id = _user_id AND t.course_type = 'core'
  );
$$;

-- ปรับ trigger function: ใช้ has_registered_* แทน has_completed_*
CREATE OR REPLACE FUNCTION public.enforce_prerequisite_on_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t_type public.course_type;
  prereq UUID;
  prereq_title TEXT;
BEGIN
  SELECT course_type, prerequisite_training_id
    INTO t_type, prereq
  FROM public.trainings WHERE id = NEW.training_id;

  IF t_type = 'core' OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF prereq IS NOT NULL THEN
    IF NOT public.has_registered_training(NEW.user_id, prereq) THEN
      SELECT title INTO prereq_title FROM public.trainings WHERE id = prereq;
      RAISE EXCEPTION 'กรุณาลงทะเบียนหลักสูตรหลัก "%": ก่อนลงทะเบียนหลักสูตรเสริมทักษะนี้', prereq_title
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT public.has_registered_any_core(NEW.user_id) THEN
    RAISE EXCEPTION 'กรุณาลงทะเบียนหลักสูตรหลักอย่างน้อย 1 หลักสูตร ก่อนลงทะเบียนหลักสูตรเสริมทักษะ'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

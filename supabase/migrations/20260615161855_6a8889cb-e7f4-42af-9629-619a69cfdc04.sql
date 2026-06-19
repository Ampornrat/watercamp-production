
-- Helper: advisor is in same institute as registration
CREATE OR REPLACE FUNCTION public.advisor_in_registration_institute(_email text, _registration_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.advisors a ON a.institute_id = r.institute_id
    WHERE r.id = _registration_id
      AND lower(a.email) = lower(_email)
  )
$$;

-- registrations: allow institute advisors to view/update by institute_id
DROP POLICY IF EXISTS "Institute advisors view institute registrations" ON public.registrations;
CREATE POLICY "Institute advisors view institute registrations"
ON public.registrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.advisors a
    WHERE a.institute_id = registrations.institute_id
      AND lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

DROP POLICY IF EXISTS "Institute advisors update institute registrations" ON public.registrations;
CREATE POLICY "Institute advisors update institute registrations"
ON public.registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.advisors a
    WHERE a.institute_id = registrations.institute_id
      AND lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

-- registration_approvals: allow institute advisors to view+manage approvals for institute registrations
DROP POLICY IF EXISTS "Institute advisors view institute approvals" ON public.registration_approvals;
CREATE POLICY "Institute advisors view institute approvals"
ON public.registration_approvals
FOR SELECT
TO authenticated
USING (
  public.advisor_in_registration_institute(coalesce(auth.jwt() ->> 'email', ''), registration_id)
);

DROP POLICY IF EXISTS "Institute advisors insert institute approvals" ON public.registration_approvals;
CREATE POLICY "Institute advisors insert institute approvals"
ON public.registration_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  public.advisor_in_registration_institute(coalesce(auth.jwt() ->> 'email', ''), registration_id)
);

DROP POLICY IF EXISTS "Institute advisors update institute approvals" ON public.registration_approvals;
CREATE POLICY "Institute advisors update institute approvals"
ON public.registration_approvals
FOR UPDATE
TO authenticated
USING (
  public.advisor_in_registration_institute(coalesce(auth.jwt() ->> 'email', ''), registration_id)
)
WITH CHECK (
  public.advisor_in_registration_institute(coalesce(auth.jwt() ->> 'email', ''), registration_id)
);

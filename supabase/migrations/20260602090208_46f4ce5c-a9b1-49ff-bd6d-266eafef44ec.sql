-- 1) Vote table
CREATE TYPE public.advisor_vote AS ENUM ('approve', 'reject');

CREATE TABLE public.registration_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  advisor_id uuid NOT NULL REFERENCES public.advisors(id) ON DELETE CASCADE,
  decision public.advisor_vote NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, advisor_id)
);

GRANT SELECT ON public.registration_approvals TO authenticated;
GRANT ALL ON public.registration_approvals TO service_role;

ALTER TABLE public.registration_approvals ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins manage approvals"
ON public.registration_approvals
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Helper: is signed-in user an institute-mate of the entered advisor on this registration
CREATE OR REPLACE FUNCTION public.advisor_can_handle_registration(_email text, _registration_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.advisors entered ON lower(entered.email) = lower(r.advisor_email)
    JOIN public.advisors me ON me.institute_id = entered.institute_id
    WHERE r.id = _registration_id
      AND lower(me.email) = lower(_email)
  );
$$;

-- Allow institute advisors to read vote rows for their registrations
CREATE POLICY "Institute advisors view approvals"
ON public.registration_approvals
FOR SELECT TO authenticated
USING (
  public.advisor_can_handle_registration(auth.jwt() ->> 'email', registration_id)
);

-- Allow institute advisors to view all registrations they can handle (not just exact email match)
CREATE POLICY "Institute advisors view supervised registrations"
ON public.registrations
FOR SELECT TO authenticated
USING (
  public.advisor_can_handle_registration(auth.jwt() ->> 'email', id)
);

CREATE TRIGGER trg_registration_approvals_updated
BEFORE UPDATE ON public.registration_approvals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
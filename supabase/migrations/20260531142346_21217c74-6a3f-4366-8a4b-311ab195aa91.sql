
-- Approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Advisors table
CREATE TABLE public.advisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  faculty TEXT NOT NULL,
  institute_id UUID REFERENCES public.institutes_tab(id),
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  postal_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Normalize email to lowercase
CREATE OR REPLACE FUNCTION public.lowercase_advisor_email()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.email = lower(trim(NEW.email)); RETURN NEW; END;
$$;

CREATE TRIGGER advisors_lower_email BEFORE INSERT OR UPDATE ON public.advisors
FOR EACH ROW EXECUTE FUNCTION public.lowercase_advisor_email();

CREATE TRIGGER advisors_set_updated_at BEFORE UPDATE ON public.advisors
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON public.advisors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisors TO authenticated;
GRANT ALL ON public.advisors TO service_role;

ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;

-- Public can view advisors (so students can look up advisor email)
CREATE POLICY "Anyone views advisors" ON public.advisors
FOR SELECT TO anon, authenticated USING (true);

-- Anyone (including anon, since registration is open) can register as advisor
CREATE POLICY "Anyone creates advisor" ON public.advisors
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Owner (matched by auth email) can update own row
CREATE POLICY "Advisor updates own row" ON public.advisors
FOR UPDATE TO authenticated
USING (lower(email) = lower((auth.jwt() ->> 'email')))
WITH CHECK (lower(email) = lower((auth.jwt() ->> 'email')));

-- Admins manage
CREATE POLICY "Admins manage advisors" ON public.advisors
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add columns to registrations
ALTER TABLE public.registrations
  ADD COLUMN advisor_email TEXT,
  ADD COLUMN approval_status public.approval_status NOT NULL DEFAULT 'pending',
  ADD COLUMN approved_at TIMESTAMPTZ,
  ADD COLUMN approved_by_advisor_id UUID REFERENCES public.advisors(id);

CREATE INDEX idx_registrations_advisor_email ON public.registrations (lower(advisor_email));

-- Advisor can view registrations where advisor_email matches their auth email
CREATE POLICY "Advisor views supervised registrations" ON public.registrations
FOR SELECT TO authenticated
USING (lower(advisor_email) = lower((auth.jwt() ->> 'email')));

-- Advisor can update approval on their supervised registrations
CREATE POLICY "Advisor updates supervised registrations" ON public.registrations
FOR UPDATE TO authenticated
USING (lower(advisor_email) = lower((auth.jwt() ->> 'email')))
WITH CHECK (lower(advisor_email) = lower((auth.jwt() ->> 'email')));

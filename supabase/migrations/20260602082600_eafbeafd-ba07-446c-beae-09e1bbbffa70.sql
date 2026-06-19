-- Enum for participation status
DO $$ BEGIN
  CREATE TYPE public.institute_participation_status AS ENUM ('join', 'decline');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.institute_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institute_id UUID NOT NULL,
  status public.institute_participation_status NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_text TEXT,
  consent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.institute_participations TO anon, authenticated;
GRANT ALL ON public.institute_participations TO service_role;

ALTER TABLE public.institute_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone creates participation"
  ON public.institute_participations FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone views participation"
  ON public.institute_participations FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage participation"
  ON public.institute_participations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_updated_at_institute_participations
  BEFORE UPDATE ON public.institute_participations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_institute_participations_institute ON public.institute_participations(institute_id);

-- Link advisors to participation record
ALTER TABLE public.advisors
  ADD COLUMN IF NOT EXISTS institute_participation_id UUID;

CREATE INDEX IF NOT EXISTS idx_advisors_participation ON public.advisors(institute_participation_id);

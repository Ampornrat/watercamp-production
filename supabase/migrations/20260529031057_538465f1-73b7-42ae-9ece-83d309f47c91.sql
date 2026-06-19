
CREATE TABLE public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  recipient_email text NOT NULL,
  recipient_name text,
  -- Section 1: demographics
  gender text CHECK (gender IN ('male','female')),
  age_range text CHECK (age_range IN ('20-30','31-40','41-50','51+')),
  education text CHECK (education IN ('below_bachelor','bachelor','master','doctoral')),
  -- Section 2: course ratings 1..5
  rating_knowledge smallint CHECK (rating_knowledge BETWEEN 1 AND 5),
  rating_application smallint CHECK (rating_application BETWEEN 1 AND 5),
  rating_instructor smallint CHECK (rating_instructor BETWEEN 1 AND 5),
  rating_assistant smallint CHECK (rating_assistant BETWEEN 1 AND 5),
  rating_materials smallint CHECK (rating_materials BETWEEN 1 AND 5),
  -- Section 3: operations 1..5
  rating_duration smallint CHECK (rating_duration BETWEEN 1 AND 5),
  rating_venue smallint CHECK (rating_venue BETWEEN 1 AND 5),
  rating_equipment smallint CHECK (rating_equipment BETWEEN 1 AND 5),
  -- Section 4
  suggestions text,
  invited_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_training ON public.survey_responses(training_id);
CREATE INDEX idx_survey_token ON public.survey_responses(token);
CREATE INDEX idx_survey_submitted ON public.survey_responses(submitted_at);

GRANT SELECT, INSERT, UPDATE ON public.survey_responses TO anon, authenticated;
GRANT ALL ON public.survey_responses TO service_role;

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Admins manage all
CREATE POLICY "Admins manage surveys"
  ON public.survey_responses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Anyone can read survey row (needed to render the form via token; token is the secret)
CREATE POLICY "Anyone reads survey by token"
  ON public.survey_responses FOR SELECT TO anon, authenticated
  USING (true);

-- Anyone can submit (update) their survey response. They must provide the token they already know,
-- but at RLS layer we allow updates on rows not yet submitted.
CREATE POLICY "Anyone submits survey response"
  ON public.survey_responses FOR UPDATE TO anon, authenticated
  USING (submitted_at IS NULL)
  WITH CHECK (true);

CREATE TRIGGER trg_survey_updated_at
  BEFORE UPDATE ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

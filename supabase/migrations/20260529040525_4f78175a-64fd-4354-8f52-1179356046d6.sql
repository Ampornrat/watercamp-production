
-- Survey Builder: flexible custom surveys

CREATE TYPE public.survey_question_type AS ENUM ('rating', 'single_choice', 'multi_choice', 'short_text', 'long_text');

CREATE TABLE public.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  collect_demographics boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.surveys TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT ALL ON public.surveys TO service_role;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views active surveys" ON public.surveys FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage surveys_v2" ON public.surveys FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  question_type public.survey_question_type NOT NULL,
  label text NOT NULL,
  description text,
  required boolean NOT NULL DEFAULT false,
  options jsonb,
  rating_max smallint DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.survey_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_questions TO authenticated;
GRANT ALL ON public.survey_questions TO service_role;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views survey questions" ON public.survey_questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage survey questions" ON public.survey_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.survey_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  training_id uuid,
  registration_id uuid,
  token text NOT NULL UNIQUE,
  recipient_email text NOT NULL,
  recipient_name text,
  gender text,
  age_range text,
  education text,
  suggestions text,
  invited_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.survey_invitations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_invitations TO authenticated;
GRANT ALL ON public.survey_invitations TO service_role;
ALTER TABLE public.survey_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads invitation by token" ON public.survey_invitations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone submits invitation" ON public.survey_invitations FOR UPDATE TO anon, authenticated USING (submitted_at IS NULL) WITH CHECK (true);
CREATE POLICY "Admins manage invitations" ON public.survey_invitations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES public.survey_invitations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  value_number numeric,
  value_text text,
  value_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invitation_id, question_id)
);
GRANT SELECT ON public.survey_answers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_answers TO authenticated;
GRANT ALL ON public.survey_answers TO service_role;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone inserts answers" ON public.survey_answers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone reads answers" ON public.survey_answers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage answers" ON public.survey_answers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_survey_questions_survey ON public.survey_questions(survey_id, position);
CREATE INDEX idx_survey_invitations_survey ON public.survey_invitations(survey_id);
CREATE INDEX idx_survey_answers_invitation ON public.survey_answers(invitation_id);

CREATE TRIGGER trg_surveys_updated BEFORE UPDATE ON public.surveys FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

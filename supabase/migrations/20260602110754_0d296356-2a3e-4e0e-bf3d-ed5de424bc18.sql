
CREATE TABLE public.contest_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text NOT NULL,
  institute_id uuid NOT NULL,
  leader_registration_id uuid NOT NULL,
  leader_name text NOT NULL,
  leader_email text NOT NULL,
  campaign_name text NOT NULL,
  concept text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.contest_teams TO anon, authenticated;
GRANT ALL ON public.contest_teams TO service_role;
ALTER TABLE public.contest_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views teams" ON public.contest_teams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone creates teams" ON public.contest_teams FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins manage teams" ON public.contest_teams FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.contest_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.contest_teams(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL,
  member_name text NOT NULL,
  member_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, registration_id)
);

GRANT SELECT, INSERT, DELETE ON public.contest_team_members TO anon, authenticated;
GRANT ALL ON public.contest_team_members TO service_role;
ALTER TABLE public.contest_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views members" ON public.contest_team_members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone creates members" ON public.contest_team_members FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins manage members" ON public.contest_team_members FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.contest_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.contest_teams(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  submitted_by_email text NOT NULL
);

GRANT SELECT, INSERT ON public.contest_submissions TO anon, authenticated;
GRANT ALL ON public.contest_submissions TO service_role;
ALTER TABLE public.contest_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views submissions" ON public.contest_submissions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone creates submissions" ON public.contest_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins manage submissions" ON public.contest_submissions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

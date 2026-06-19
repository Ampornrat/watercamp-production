
-- Restore Data API grants on all public tables
DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.relname);
  END LOOP;
END $$;

-- Public-readable tables (anon SELECT)
GRANT SELECT ON public.trainings TO anon;
GRANT SELECT ON public.institutes_tab TO anon;
GRANT SELECT ON public.surveys TO anon;
GRANT SELECT ON public.survey_questions TO anon;
GRANT SELECT, INSERT ON public.survey_responses TO anon;
GRANT SELECT, INSERT ON public.survey_answers TO anon;
GRANT SELECT ON public.survey_invitations TO anon;
GRANT SELECT, INSERT ON public.registrations TO anon;
GRANT SELECT ON public.registration_approvals TO anon;
GRANT SELECT, INSERT ON public.advisors TO anon;
GRANT SELECT, INSERT ON public.contest_teams TO anon;
GRANT SELECT, INSERT ON public.contest_team_members TO anon;
GRANT SELECT, INSERT ON public.contest_submissions TO anon;
GRANT SELECT ON public.email_unsubscribe_tokens TO anon;
GRANT SELECT ON public.suppressed_emails TO anon;

-- Sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

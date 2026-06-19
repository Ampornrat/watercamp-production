DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

GRANT SELECT ON public.trainings TO anon;
GRANT SELECT ON public.institutes_tab TO anon;
GRANT SELECT ON public.surveys TO anon;
GRANT SELECT ON public.survey_questions TO anon;
GRANT SELECT, INSERT ON public.survey_responses TO anon;
GRANT SELECT, INSERT ON public.survey_answers TO anon;
GRANT SELECT, UPDATE ON public.survey_invitations TO anon;
GRANT SELECT, INSERT ON public.registrations TO anon;
GRANT SELECT, INSERT ON public.registration_approvals TO anon;
GRANT SELECT, INSERT ON public.advisors TO anon;
GRANT SELECT, INSERT ON public.contest_teams TO anon;
GRANT SELECT, INSERT ON public.contest_team_members TO anon;
GRANT SELECT, INSERT ON public.contest_submissions TO anon;
GRANT SELECT ON public.email_unsubscribe_tokens TO anon;
GRANT INSERT ON public.suppressed_emails TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT ON TABLE public.trainings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.trainings TO authenticated;
GRANT ALL ON TABLE public.trainings TO service_role;
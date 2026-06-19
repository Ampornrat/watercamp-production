CREATE TABLE public.institutes_tab (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region TEXT NOT NULL,
  institute TEXT NOT NULL,
  start_semester TEXT,
  link_url_logo TEXT,
  link_url TEXT,
  coordinator_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.institutes_tab TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutes_tab TO authenticated;
GRANT ALL ON public.institutes_tab TO service_role;

ALTER TABLE public.institutes_tab ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views institutes"
ON public.institutes_tab FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage institutes"
ON public.institutes_tab FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_institutes_tab_updated_at
BEFORE UPDATE ON public.institutes_tab
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- Add advisor role (main / assistant) with one main per institute
CREATE TYPE public.advisor_role AS ENUM ('main', 'assistant');

ALTER TABLE public.advisors
  ADD COLUMN role public.advisor_role NOT NULL DEFAULT 'assistant';

-- Enforce only one main advisor per institute
CREATE UNIQUE INDEX advisors_one_main_per_institute
  ON public.advisors(institute_id)
  WHERE role = 'main';

-- Helpful index for lookups by institute
CREATE INDEX IF NOT EXISTS advisors_institute_idx ON public.advisors(institute_id);
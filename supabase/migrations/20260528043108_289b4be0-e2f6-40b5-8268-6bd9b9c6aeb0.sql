
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS pdpa_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pdpa_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdpa_consent_text text;

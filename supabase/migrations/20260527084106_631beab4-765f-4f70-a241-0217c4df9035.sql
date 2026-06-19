ALTER TABLE public.registrations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS guest_phone text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS guest_organization text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS guest_position text;
GRANT INSERT ON public.registrations TO anon;
DROP POLICY IF EXISTS "Guests create registrations" ON public.registrations;
CREATE POLICY "Guests create registrations" ON public.registrations
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL AND guest_email IS NOT NULL AND guest_name IS NOT NULL);
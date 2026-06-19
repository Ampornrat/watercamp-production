DROP POLICY IF EXISTS "Anyone views published trainings" ON public.trainings;

CREATE POLICY "Public can view published trainings"
ON public.trainings
FOR SELECT
TO anon
USING (is_published = true);

CREATE POLICY "Authenticated users can view published trainings"
ON public.trainings
FOR SELECT
TO authenticated
USING (is_published = true OR public.has_role(auth.uid(), 'admin'::public.app_role));
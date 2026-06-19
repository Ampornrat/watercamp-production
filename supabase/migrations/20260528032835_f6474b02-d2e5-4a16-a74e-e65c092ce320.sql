
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS attachment_1_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_1_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_2_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_2_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_3_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_3_name TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('training-attachments', 'training-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone view training attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-attachments');

CREATE POLICY "Admins upload training attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'training-attachments' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update training attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'training-attachments' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete training attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'training-attachments' AND has_role(auth.uid(), 'admin'::app_role));


INSERT INTO storage.buckets (id, name, public) VALUES ('training-covers', 'training-covers', true);

CREATE POLICY "Public read training covers" ON storage.objects FOR SELECT USING (bucket_id = 'training-covers');
CREATE POLICY "Admins upload training covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'training-covers' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update training covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'training-covers' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete training covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'training-covers' AND has_role(auth.uid(), 'admin'::app_role));

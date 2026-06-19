
CREATE POLICY "Anyone reads contest files" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'contest-submissions');
CREATE POLICY "Anyone uploads contest files" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'contest-submissions');

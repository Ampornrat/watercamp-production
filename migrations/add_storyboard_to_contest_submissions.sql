ALTER TABLE contest_submissions
  ADD COLUMN storyboard_url TEXT NULL AFTER file_size,
  ADD COLUMN storyboard_file_name VARCHAR(255) NULL AFTER storyboard_url,
  ADD COLUMN storyboard_file_size BIGINT NULL AFTER storyboard_file_name;

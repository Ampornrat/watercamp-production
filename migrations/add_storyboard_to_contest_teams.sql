ALTER TABLE contest_teams
  ADD COLUMN storyboard_url TEXT NULL AFTER concept,
  ADD COLUMN storyboard_file_name VARCHAR(255) NULL AFTER storyboard_url,
  ADD COLUMN storyboard_file_size BIGINT NULL AFTER storyboard_file_name;

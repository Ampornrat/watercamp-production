-- Add admin-managed engagement_score per team (view/like/share from external platforms)
ALTER TABLE contest_teams
  ADD COLUMN engagement_score DECIMAL(5,2) NULL COMMENT 'admin-set engagement score (view/like/share)' AFTER score;

-- Add judge comment column to round-2 scores
ALTER TABLE contest_scores_r2
  ADD COLUMN comment TEXT NULL AFTER engagement_score;

-- Add submission type to distinguish original vs revised submissions
ALTER TABLE contest_submissions
  ADD COLUMN submission_type ENUM('original', 'revised') NOT NULL DEFAULT 'original' AFTER team_id;

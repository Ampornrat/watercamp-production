-- Production sync script — safe to run on existing DB (guards against duplicate columns)
-- Run all pending migrations in order

-- 1. users: password reset fields
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS reset_password_expires_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS reset_token_used TINYINT(1) NOT NULL DEFAULT 0;

-- 2. contest_teams: storyboard fields
ALTER TABLE contest_teams
  ADD COLUMN IF NOT EXISTS storyboard_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS storyboard_file_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS storyboard_file_size BIGINT NULL;

-- 3. contest_submissions: storyboard fields
ALTER TABLE contest_submissions
  ADD COLUMN IF NOT EXISTS storyboard_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS storyboard_file_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS storyboard_file_size BIGINT NULL;

-- 4. contest_teams: round 1 scoring fields
ALTER TABLE contest_teams
  ADD COLUMN IF NOT EXISTS score DECIMAL(5,2) NULL,
  ADD COLUMN IF NOT EXISTS round1_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS round1_approved_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS round1_notes TEXT NULL;

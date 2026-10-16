-- Add round 1 scoring and approval columns to contest_teams
ALTER TABLE contest_teams
  ADD COLUMN score DECIMAL(5,2) NULL,
  ADD COLUMN round1_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN round1_approved_at DATETIME NULL,
  ADD COLUMN round1_notes TEXT NULL;

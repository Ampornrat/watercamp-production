-- Production sync script — MySQL 5.7 compatible
-- Uses stored procedure to skip columns that already exist

DROP PROCEDURE IF EXISTS _add_col;

DELIMITER $$
CREATE PROCEDURE _add_col(
  IN tbl VARCHAR(64),
  IN col VARCHAR(64),
  IN def TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = tbl
      AND COLUMN_NAME  = col
  ) THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', def);
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- 1. users: password reset fields
CALL _add_col('users', 'reset_password_token',    'VARCHAR(64) NULL');
CALL _add_col('users', 'reset_password_expires_at','DATETIME NULL');
CALL _add_col('users', 'reset_token_used',         'TINYINT(1) NOT NULL DEFAULT 0');

-- 2. contest_teams: storyboard fields
CALL _add_col('contest_teams', 'storyboard_url',       'TEXT NULL');
CALL _add_col('contest_teams', 'storyboard_file_name', 'VARCHAR(255) NULL');
CALL _add_col('contest_teams', 'storyboard_file_size', 'BIGINT NULL');

-- 3. contest_submissions: storyboard fields
CALL _add_col('contest_submissions', 'storyboard_url',       'TEXT NULL');
CALL _add_col('contest_submissions', 'storyboard_file_name', 'VARCHAR(255) NULL');
CALL _add_col('contest_submissions', 'storyboard_file_size', 'BIGINT NULL');

-- 4. contest_teams: round 1 scoring fields
CALL _add_col('contest_teams', 'score',              'DECIMAL(5,2) NULL');
CALL _add_col('contest_teams', 'round1_status',      "ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'");
CALL _add_col('contest_teams', 'round1_approved_at', 'DATETIME NULL');
CALL _add_col('contest_teams', 'round1_notes',       'TEXT NULL');

DROP PROCEDURE IF EXISTS _add_col;

-- 5. contest_scores table (judge scoring system)
-- Note: id and team_id must be CHAR(36) to match contest_teams.id (CHAR(36) utf8mb4_unicode_ci)
CREATE TABLE IF NOT EXISTS contest_scores (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  judge_name VARCHAR(255) NOT NULL,
  judge_email VARCHAR(255) NOT NULL,
  stem_score DECIMAL(5,2) NOT NULL,
  content_score DECIMAL(5,2) NOT NULL,
  presentation_score DECIMAL(5,2) NOT NULL,
  total_score DECIMAL(5,2) AS (stem_score + content_score + presentation_score) STORED,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_judge_team (judge_email, team_id),
  KEY idx_team (team_id),
  CONSTRAINT fk_cs_team FOREIGN KEY (team_id) REFERENCES contest_teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

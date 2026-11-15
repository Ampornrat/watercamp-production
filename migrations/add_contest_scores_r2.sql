-- Round 2 scoring table
-- เกณฑ์: STEM 30 + ThaiWater App 30 + เล่าเรื่อง 30 + ยอดมีส่วนร่วม 10 = 100

CREATE TABLE IF NOT EXISTS contest_scores_r2 (
  id               CHAR(36)       NOT NULL,
  team_id          CHAR(36)       NOT NULL,
  judge_name       VARCHAR(255)   NOT NULL,
  judge_email      VARCHAR(255)   NOT NULL,
  stem_score       DECIMAL(5,2)   NOT NULL DEFAULT 0,
  thaiwater_score  DECIMAL(5,2)   NOT NULL DEFAULT 0,
  storytelling_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  engagement_score DECIMAL(5,2)   NOT NULL DEFAULT 0,
  total_score      DECIMAL(6,2)   GENERATED ALWAYS AS (stem_score + thaiwater_score + storytelling_score + engagement_score) STORED,
  submitted_at     DATETIME       NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_judge_team (judge_email, team_id),
  CONSTRAINT fk_csr2_team FOREIGN KEY (team_id) REFERENCES contest_teams(id)
);

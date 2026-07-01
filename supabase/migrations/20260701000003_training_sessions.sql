CREATE TABLE training_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  training_id CHAR(36) NOT NULL,
  region VARCHAR(50) NOT NULL,
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  location VARCHAR(255),
  online_url VARCHAR(500),
  capacity INT NOT NULL DEFAULT 30,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE registrations
  ADD COLUMN session_id CHAR(36) DEFAULT NULL AFTER training_id,
  ADD CONSTRAINT fk_reg_session FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE SET NULL;

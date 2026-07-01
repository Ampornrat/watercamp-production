-- MySQL 8 schema for WaterCamp (converted from Supabase PostgreSQL migrations)
-- Run as: mysql -u usr_watercamp -p db_watercamp < mysql-schema.sql

CREATE TABLE IF NOT EXISTS trainings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  instructor VARCHAR(255),
  location VARCHAR(255),
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  capacity INT NOT NULL DEFAULT 30,
  registration_deadline DATETIME,
  cover_image_url TEXT,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  course_type VARCHAR(50) DEFAULT 'elective',
  required_for_contest TINYINT(1) NOT NULL DEFAULT 0,
  prerequisite_training_id CHAR(36),
  attachment_1_url TEXT,
  attachment_1_name VARCHAR(255),
  attachment_2_url TEXT,
  attachment_2_name VARCHAR(255),
  attachment_3_url TEXT,
  attachment_3_name VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (prerequisite_training_id) REFERENCES trainings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS institutes_tab (
  id CHAR(36) NOT NULL PRIMARY KEY,
  institute VARCHAR(255),
  name VARCHAR(255),
  region VARCHAR(50),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_sessions (
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

CREATE TABLE IF NOT EXISTS registrations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  training_id CHAR(36) NOT NULL,
  session_id CHAR(36) DEFAULT NULL,
  institute_id CHAR(36),
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  student_id VARCHAR(50),
  wants_sim TINYINT(1) DEFAULT NULL,
  gender VARCHAR(50),
  age INT,
  education_level VARCHAR(100),
  education_level_other VARCHAR(255),
  field_of_study VARCHAR(255),
  participant_status VARCHAR(100),
  participant_status_other VARCHAR(255),
  approval_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  completion_status VARCHAR(50) NOT NULL DEFAULT 'enrolled',
  self_confirmed_at DATETIME DEFAULT NULL,
  pdpa_consent TINYINT(1) DEFAULT 0,
  pdpa_consent_at DATETIME,
  pdpa_consent_text TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (institute_id) REFERENCES institutes_tab(id) ON DELETE SET NULL,
  UNIQUE KEY uq_registration (training_id, guest_email(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS advisors (
  id CHAR(36) NOT NULL PRIMARY KEY,
  institute_id CHAR(36),
  full_name VARCHAR(255) NOT NULL,
  position VARCHAR(255),
  faculty VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  postal_code VARCHAR(20),
  role VARCHAR(50) NOT NULL DEFAULT 'assistant',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institute_id) REFERENCES institutes_tab(id) ON DELETE SET NULL,
  UNIQUE KEY uq_advisor_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS survey_responses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  token VARCHAR(128) NOT NULL UNIQUE,
  training_id CHAR(36),
  submitted_at DATETIME,
  gender VARCHAR(20),
  age_range VARCHAR(20),
  education VARCHAR(40),
  suggestions TEXT,
  rating_knowledge INT,
  rating_application INT,
  rating_instructor INT,
  rating_assistant INT,
  rating_materials INT,
  rating_duration INT,
  rating_venue INT,
  rating_equipment INT,
  recipient_email VARCHAR(255),
  recipient_name VARCHAR(255),
  registration_id CHAR(36),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS surveys (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS survey_questions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  survey_id CHAR(36) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL DEFAULT 'rating',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS survey_invitations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  survey_id CHAR(36),
  training_id CHAR(36),
  registration_id CHAR(36),
  token VARCHAR(128) NOT NULL UNIQUE,
  recipient_email VARCHAR(255),
  recipient_name VARCHAR(255),
  submitted_at DATETIME,
  gender VARCHAR(20),
  age_range VARCHAR(20),
  education VARCHAR(40),
  suggestions TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE SET NULL,
  FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS survey_answers (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  invitation_id CHAR(36) NOT NULL,
  question_id CHAR(36) NOT NULL,
  value_number DOUBLE,
  value_text TEXT,
  value_json JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invitation_id) REFERENCES survey_invitations(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES survey_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS institute_participations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  institute_id CHAR(36),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  consent_given TINYINT(1) DEFAULT 0,
  consent_text TEXT,
  consent_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institute_id) REFERENCES institutes_tab(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contest_teams (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_name VARCHAR(120) NOT NULL,
  institute_id CHAR(36),
  leader_registration_id CHAR(36),
  leader_name VARCHAR(255),
  leader_email VARCHAR(255),
  campaign_name VARCHAR(200),
  concept TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institute_id) REFERENCES institutes_tab(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contest_team_members (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  registration_id CHAR(36),
  member_name VARCHAR(255),
  member_email VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES contest_teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contest_submissions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  campaign_name VARCHAR(200),
  file_url TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  note TEXT,
  submitted_by_email VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES contest_teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  role ENUM('admin', 'advisor', 'student') NOT NULL DEFAULT 'student',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_otp (
  email VARCHAR(255) NOT NULL PRIMARY KEY,
  otp CHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invite_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

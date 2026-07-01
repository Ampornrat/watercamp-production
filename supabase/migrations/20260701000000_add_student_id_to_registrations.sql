ALTER TABLE registrations
  ADD COLUMN student_id VARCHAR(50) DEFAULT NULL AFTER guest_email;

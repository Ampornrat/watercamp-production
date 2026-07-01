ALTER TABLE registrations
  ADD COLUMN wants_sim TINYINT(1) DEFAULT NULL AFTER guest_email;

-- Migration: Add password reset fields to users table
-- Run this on an existing database (mysql-schema.sql already includes these columns for fresh installs)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(64) NULL
    COMMENT 'SHA-256 hash of the one-time reset token',
  ADD COLUMN IF NOT EXISTS reset_password_expires_at DATETIME NULL
    COMMENT 'Token expiry (20 minutes from generation)',
  ADD COLUMN IF NOT EXISTS reset_token_used TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Prevents token reuse after first use';

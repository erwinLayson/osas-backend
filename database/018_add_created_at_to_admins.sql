-- 018: Restore created_at/updated_at on admins.
-- Migration 011 defined them, but the live table only has
-- id/username/email/password, so the ManageAdmin creation-date column
-- could never render. Backfill existing rows with NOW().
ALTER TABLE admins
  ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

UPDATE admins SET created_at = NOW() WHERE created_at IS NULL;

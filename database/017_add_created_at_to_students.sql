-- 017: Restore created_at/updated_at on students.
-- Migration 002 defined them, but the live table drifted and no longer has
-- them, which broke date rendering in the admin Students page and the
-- DATE(created_at) filters used by student reports.
ALTER TABLE students
  ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

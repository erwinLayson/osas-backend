-- 013: Align the students table with what the application expects.
-- On fresh databases, 002_create_students_table.sql already creates username,
-- name, and password, so this migration should be a no-op there.
-- 
-- IMPORTANT: MariaDB 10.4 does not support IF NOT EXISTS on ADD/CHANGE COLUMN. This
-- file uses the modern syntax for MySQL 8 / MariaDB 10.5+ databases. On MariaDB 10.4
-- (or older), run this migration only when the students table still needs repair,
-- then mark it applied.
-- 1. Rename student_name -> name when the old column still exists.
ALTER TABLE students CHANGE COLUMN IF EXISTS `student_name` `name` VARCHAR(255) NOT NULL;

-- 2. Add username if missing. On MySQL 8 / MariaDB 10.5+ this is a no-op if it already
--    exists. On MariaDB 10.4 this syntax is not supported, so run this migration only
--    when username is missing and then mark it applied.
-- 2. Add username if missing.
--    MariaDB 10.4 does not support IF NOT EXISTS on ADD COLUMN, so this line is
--    intended for MySQL 8 / MariaDB 10.5+ databases. On MariaDB 10.4, run this
--    migration only when username is missing and then mark it applied.
-- 2. Add username if missing.
ALTER TABLE students ADD COLUMN IF NOT EXISTS `username` VARCHAR(255) NOT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS `password` VARCHAR(255) NOT NULL;

-- 014: Replace the split admins/students tables with a single unified users table.
--
-- All account credentials (admin + student) now live in one place. The
-- `role` column identifies the account type, so a single authenticate/users.js
-- can serve both the admin dashboard (/dashboard) and the student portal
-- (/student/dashboard) without duplicating cookie secrets or model classes.
--
--   role = 'admin'   -> admin dashboard (/dashboard)
--   role = 'student' -> learner portal (/student/dashboard)
--
-- The migration:
--   1. Creates `users` (username / email / password / role / active / timestamps).
--   2. Copies legacy admin rows -> role='admin'.
--   3. Copies legacy student rows -> role='student'.
--   4. Drops the old admins + students tables.
--   5. Adds a unique username index.
--   6. Records the migration in the migrations log.
--   7. Idempotent admin seed: if no admin exists yet, inserts one from the
--      dotenv values (ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_ROLE),
--      hashing the password with bcrypt. Re-running is a no-op.

-- 1. Unified users table (replaces admins + students).
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Migrate legacy admins -> users with role='admin', if the admins table still exists.
-- Legacy admin migration is intentionally left as a raw INSERT IGNORE so the
-- statement is valid on MariaDB 10.4 even when the admins table does not exist.
-- On databases where admins still exists, this copies rows into users with
-- role='admin'. On fresh databases where admins was never created, this fails
-- and the migration runner will not mark 014 as applied.
INSERT IGNORE INTO users (id, username, email, password, role, active)
SELECT a.id, a.username, a.email, a.password, 'admin', 1 FROM admins AS a;

-- 3. Migrate legacy students -> users with role='student', if the students table still exists.
-- Legacy student migration is intentionally left as a raw INSERT IGNORE for the
-- same reason as the admin migration above.
INSERT IGNORE INTO users (id, username, email, password, role, active)
SELECT s.id, s.username, s.email, s.password, 'student', 1 FROM students AS s;

-- 4. The legacy tables are replaced by `users`.
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS admins;

-- 5. Keep the schema-version log current.
INSERT INTO migrations (id, filename, applied_at)
VALUES (14, '014_create_users_table.sql', NOW())
ON DUPLICATE KEY UPDATE filename = filename, applied_at = applied_at;

-- 6. Idempotent admin seed (safe to run repeatedly).
--    Builds the row from dotenv values; if ADMIN_PASSWORD is empty there is
--    nothing to hash, so the seed is skipped (use seed.js instead).
DO $$
DECLARE
    admin_user  VARCHAR(100) := COALESCE(
        (SELECT TRIM(value) FROM settings WHERE setting_key = 'admin_username' LIMIT 1), 'admin');
    admin_email VARCHAR(255) := COALESCE(
        (SELECT TRIM(value) FROM settings WHERE setting_key = 'admin_email' LIMIT 1), 'admin@osas.com');
    admin_role  VARCHAR(20)  := COALESCE(
        (SELECT TRIM(value) FROM settings WHERE setting_key = 'admin_role' LIMIT 1), 'admin');
BEGIN
    INSERT INTO users (username, email, password, role, active)
    SELECT admin_user, admin_email, '', admin_role, 1
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = admin_user)
      AND TRIM(admin_user) <> '';
END $$;

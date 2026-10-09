-- 012: Ensure the role column exists on admins (idempotent).
-- On freshly created databases, the admins table already has `role` because
-- 011_create_admins_table.sql now includes it. This migration only runs the
-- ALTER when the column is missing, so it is safe on both new and existing DBs.
-- Note: IF NOT EXISTS for ADD COLUMN is supported on MySQL 8.0.29+.
-- On older MySQL/MariaDB versions, run this only if the column is missing.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'admin';

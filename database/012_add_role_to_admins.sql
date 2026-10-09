-- 012: Add role column to admins for role-based access control (RBAC).
ALTER TABLE admins
ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'admin';

-- Backfill any pre-existing rows (defensive; DEFAULT already covers new rows).
UPDATE admins SET role = 'admin' WHERE role IS NULL OR role = '';

-- 018: Restore created_at/updated_at on admins.
-- On fresh databases, 011_create_admins_table.sql now creates both of these,
-- so this migration is only needed on older databases that still lack them.
-- 
-- IMPORTANT: MariaDB 10.4 does not support IF NOT EXISTS on ADD COLUMN. This file
-- uses the modern syntax for MySQL 8 / MariaDB 10.5+ databases. On MariaDB 10.4
-- (or older), run this migration only when admins still lacks created_at/updated_at,
-- then mark it applied.
-- On fresh databases, 011_create_admins_table.sql now creates both of these,
-- so this migration is only needed on older databases that still lack them.
-- This file uses the modern ADD COLUMN IF NOT EXISTS syntax for MySQL 8 /
-- MariaDB 10.5+ databases. On MariaDB 10.4 (or older), that syntax is not
-- supported, so run this migration only when admins still lacks the columns,
-- then mark it applied.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

UPDATE admins SET created_at = NOW() WHERE created_at IS NULL;

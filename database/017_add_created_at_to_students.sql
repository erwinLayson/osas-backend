-- 017: Restore created_at/updated_at on students.
-- On fresh databases, 002_create_students_table.sql now creates both of these,
-- so this migration is only needed on older databases that still lack them.
ALTER TABLE students ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

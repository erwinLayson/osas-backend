-- 009: Add session_id to recent_grades to track admin-enabled sessions.
-- On fresh databases, 008_create_recent_grades_table.sql now creates this column,
-- so this migration is only needed on older databases that still lack it.
ALTER TABLE `recent_grades` ADD COLUMN IF NOT EXISTS `session_id` VARCHAR(100) DEFAULT NULL;

-- 009: Add session_id to recent_grades to track admin-enabled sessions
ALTER TABLE `recent_grades`
ADD COLUMN `session_id` VARCHAR(100) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_recent_grades_session ON `recent_grades` (`session_id`);

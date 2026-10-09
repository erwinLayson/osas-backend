ALTER TABLE `recent_grades`
ADD COLUMN `semester` VARCHAR(50) DEFAULT NULL,
ADD COLUMN `average` DECIMAL(6,2) DEFAULT NULL;

-- Optional: index for lookup by student and semester
CREATE INDEX IF NOT EXISTS idx_recent_grades_student_semester ON `recent_grades` (`id`, `semester`);

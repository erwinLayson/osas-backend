-- 010: Add semester and average to recent_grades
ALTER TABLE `recent_grades`
ADD COLUMN `semester` VARCHAR(50) DEFAULT NULL,
ADD COLUMN `average` DECIMAL(6,2) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_recent_grades_student_semester ON `recent_grades` (`id`, `semester`);

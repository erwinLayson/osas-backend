-- 010: Add semester and average to recent_grades.
-- On fresh databases, 008_create_recent_grades_table.sql now creates both columns,
-- so this migration is only needed on older databases that still lack them.
ALTER TABLE `recent_grades` ADD COLUMN IF NOT EXISTS `semester` VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `average` DECIMAL(6,2) DEFAULT NULL;

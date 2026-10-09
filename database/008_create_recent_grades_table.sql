-- 008: Recent grades table.
-- Created complete so later ALTERs (009, 010) are no-ops on fresh databases.
CREATE TABLE IF NOT EXISTS `recent_grades` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `studentId` INT NOT NULL,
  `studentName` VARCHAR(255),
  `subjects` TEXT,
  `session_id` VARCHAR(100) DEFAULT NULL,
  `semester` VARCHAR(50) DEFAULT NULL,
  `average` DECIMAL(6,2) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX (`studentId`),
  INDEX `idx_recent_grades_session` (`session_id`),
  INDEX `idx_recent_grades_student_semester` (`id`, `semester`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

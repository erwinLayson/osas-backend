CREATE TABLE IF NOT EXISTS `recent_grades` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `studentId` INT NOT NULL,
  `studentName` VARCHAR(255),
  `subjects` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX (`studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

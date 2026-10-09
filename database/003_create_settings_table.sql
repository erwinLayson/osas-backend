-- 003: Settings table
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(191) NOT NULL UNIQUE,
  `setting_value` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed a default value for allow_grade_edit if it doesn't exist.
-- Seed a default value for allow_grade_edit if it doesn't exist.
-- Seed a default value for allow_grade_edit if it doesn't exist.
INSERT INTO `settings` (setting_key, setting_value)
VALUES ('allow_grade_edit', 'false')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

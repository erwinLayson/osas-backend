CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(191) NOT NULL UNIQUE,
  `setting_value` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ensure a default value for allow_grade_edit
INSERT INTO `settings` (setting_key, setting_value)
SELECT 'allow_grade_edit', 'false' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `settings` WHERE setting_key = 'allow_grade_edit');

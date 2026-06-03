CREATE TABLE IF NOT EXISTS `lab_technician_departments` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int(10) UNSIGNED NOT NULL,
  `department_key` varchar(80) NOT NULL,
  `department_name` varchar(120) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_labtech_dept` (`user_id`,`department_key`),
  KEY `idx_labtech_dept_user` (`user_id`),
  CONSTRAINT `fk_labtech_dept_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

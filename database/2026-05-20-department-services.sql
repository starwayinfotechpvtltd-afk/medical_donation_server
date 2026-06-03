-- Migration: ensure department_services supports storing service tags per department
-- Date: 2026-05-20

CREATE TABLE IF NOT EXISTS department_services (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  department_id INT UNSIGNED NOT NULL,
  service_name VARCHAR(150) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_department_services_department_id (department_id),
  CONSTRAINT fk_department_services_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELETE ds1
FROM department_services ds1
JOIN department_services ds2
  ON ds1.department_id = ds2.department_id
 AND ds1.service_name = ds2.service_name
 AND ds1.id > ds2.id;

SET @create_uq := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'department_services'
        AND index_name = 'uq_department_service_name'
    ),
    'SELECT 1',
    'CREATE UNIQUE INDEX uq_department_service_name ON department_services (department_id, service_name)'
  )
);
PREPARE stmt_uq FROM @create_uq;
EXECUTE stmt_uq;
DEALLOCATE PREPARE stmt_uq;

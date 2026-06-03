ALTER TABLE `lab_technician_profiles`
  ADD COLUMN `full_name` VARCHAR(150) NOT NULL AFTER `user_id`,
  ADD COLUMN `lab_name` VARCHAR(255) NOT NULL AFTER `full_name`,
  ADD COLUMN `licence_number` VARCHAR(150) NOT NULL AFTER `lab_name`,
  ADD COLUMN `certificate_image` VARCHAR(500) DEFAULT NULL AFTER `licence_number`,
  ADD COLUMN `gst_number` VARCHAR(100) DEFAULT NULL AFTER `certificate_image`,
  ADD COLUMN `address` TEXT NOT NULL AFTER `gst_number`,
  ADD COLUMN `email` VARCHAR(150) NOT NULL AFTER `address`,
  ADD COLUMN `mobile_number` VARCHAR(20) NOT NULL AFTER `email`,
  ADD COLUMN `pan_number` VARCHAR(50) DEFAULT NULL AFTER `mobile_number`,
  ADD COLUMN `pan_image` VARCHAR(500) DEFAULT NULL AFTER `pan_number`,
  ADD COLUMN `lab_profile_image` VARCHAR(500) DEFAULT NULL AFTER `pan_image`,
  ADD COLUMN `lab_time` VARCHAR(100) DEFAULT NULL AFTER `lab_profile_image`;

import { pool } from '../config/db.js';

let initialized = false;

const ensureTable = async () => {
  if (initialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS doctor_medications (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      doctor_profile_id INT UNSIGNED NOT NULL,
      name VARCHAR(191) NOT NULL,
      generic_name VARCHAR(191) NULL,
      category VARCHAR(120) NULL,
      default_dosage VARCHAR(120) NULL,
      default_frequency VARCHAR(120) NULL,
      default_duration VARCHAR(120) NULL,
      default_route VARCHAR(80) NULL,
      notes TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_dm_doctor (doctor_profile_id),
      CONSTRAINT fk_dm_doctor_profile
        FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles(id)
        ON DELETE CASCADE
    )
  `);
  initialized = true;
};

export const listDoctorMedications = async (doctorProfileId) => {
  await ensureTable();
  const [rows] = await pool.query(
    `SELECT * FROM doctor_medications
     WHERE doctor_profile_id = ?
     ORDER BY is_active DESC, name ASC`,
    [doctorProfileId]
  );
  return rows;
};

export const createDoctorMedication = async (doctorProfileId, data) => {
  await ensureTable();
  const [result] = await pool.query(
    `INSERT INTO doctor_medications
     (doctor_profile_id, name, generic_name, category, default_dosage, default_frequency, default_duration, default_route, notes, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      doctorProfileId,
      data.name.trim(),
      data.generic_name || null,
      data.category || null,
      data.default_dosage || null,
      data.default_frequency || null,
      data.default_duration || null,
      data.default_route || 'oral',
      data.notes || null,
      data.is_active === false ? 0 : 1,
    ]
  );
  return result.insertId;
};

export const updateDoctorMedication = async (doctorProfileId, id, data) => {
  await ensureTable();
  await pool.query(
    `UPDATE doctor_medications
     SET name = ?, generic_name = ?, category = ?, default_dosage = ?, default_frequency = ?, default_duration = ?, default_route = ?, notes = ?, is_active = ?, updated_at = NOW()
     WHERE id = ? AND doctor_profile_id = ?`,
    [
      data.name.trim(),
      data.generic_name || null,
      data.category || null,
      data.default_dosage || null,
      data.default_frequency || null,
      data.default_duration || null,
      data.default_route || 'oral',
      data.notes || null,
      data.is_active === false ? 0 : 1,
      id,
      doctorProfileId,
    ]
  );
};

export const deleteDoctorMedication = async (doctorProfileId, id) => {
  await ensureTable();
  await pool.query(
    'DELETE FROM doctor_medications WHERE id = ? AND doctor_profile_id = ?',
    [id, doctorProfileId]
  );
};

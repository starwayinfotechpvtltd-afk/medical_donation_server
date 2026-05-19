import { pool } from '../config/db.js';

let initialized = false;

const ensureTables = async () => {
  if (initialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS doctor_prescription_templates (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      doctor_profile_id INT UNSIGNED NOT NULL,
      name VARCHAR(191) NOT NULL,
      diagnosis VARCHAR(191) NULL,
      notes TEXT NULL,
      follow_up_days INT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_dpt_doctor (doctor_profile_id),
      CONSTRAINT fk_dpt_doctor_profile
        FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS doctor_template_usage (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      template_id INT UNSIGNED NOT NULL,
      prescription_id INT UNSIGNED NOT NULL,
      used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_dtu_template (template_id),
      INDEX idx_dtu_prescription (prescription_id),
      CONSTRAINT fk_dtu_template
        FOREIGN KEY (template_id) REFERENCES doctor_prescription_templates(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_dtu_prescription
        FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS doctor_prescription_template_assets (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      template_id INT UNSIGNED NOT NULL,
      file_url VARCHAR(500) NOT NULL,
      file_name VARCHAR(255) NULL,
      file_type ENUM('image','document') NOT NULL,
      mime_type VARCHAR(120) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_dpta_template (template_id),
      CONSTRAINT fk_dpta_template
        FOREIGN KEY (template_id) REFERENCES doctor_prescription_templates(id)
        ON DELETE CASCADE
    )
  `);
  initialized = true;
};

export const listTemplates = async (doctorProfileId) => {
  await ensureTables();
  const [rows] = await pool.query(
    `SELECT t.*, COUNT(u.id) AS usage_count
     FROM doctor_prescription_templates t
     LEFT JOIN doctor_template_usage u ON u.template_id = t.id
     WHERE t.doctor_profile_id = ?
     GROUP BY t.id
     ORDER BY t.updated_at DESC`,
    [doctorProfileId]
  );
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const [assets] = await pool.query(
    `SELECT * FROM doctor_prescription_template_assets
     WHERE template_id IN (?)
     ORDER BY sort_order ASC, id ASC`,
    [ids]
  );
  const assetMap = new Map();
  for (const asset of assets) {
    const arr = assetMap.get(asset.template_id) || [];
    arr.push(asset);
    assetMap.set(asset.template_id, arr);
  }

  return rows.map((row) => ({
    ...row,
    medicines: [],
    assets: assetMap.get(row.id) || [],
  }));
};

export const getTemplateById = async (doctorProfileId, id) => {
  await ensureTables();
  const [rows] = await pool.query(
    'SELECT * FROM doctor_prescription_templates WHERE id = ? AND doctor_profile_id = ? LIMIT 1',
    [id, doctorProfileId]
  );
  if (!rows[0]) return null;
  const [assets] = await pool.query(
    `SELECT * FROM doctor_prescription_template_assets
     WHERE template_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [id]
  );
  return { ...rows[0], medicines: [], assets };
};

export const createTemplate = async (doctorProfileId, data) => {
  await ensureTables();
  const [result] = await pool.query(
    `INSERT INTO doctor_prescription_templates
     (doctor_profile_id, name, diagnosis, notes, follow_up_days, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      doctorProfileId,
      data.name.trim(),
      data.diagnosis || null,
      data.notes || null,
      data.follow_up_days || null,
      data.is_active === false ? 0 : 1,
    ]
  );
  const templateId = result.insertId;
  if (Array.isArray(data.assets) && data.assets.length > 0) {
    const assetValues = data.assets.map((a, idx) => [
      templateId,
      a.file_url,
      a.file_name || null,
      a.file_type === 'document' ? 'document' : 'image',
      a.mime_type || null,
      Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : idx,
    ]);
    await pool.query(
      `INSERT INTO doctor_prescription_template_assets
       (template_id, file_url, file_name, file_type, mime_type, sort_order)
       VALUES ?`,
      [assetValues]
    );
  }
  return templateId;
};

export const updateTemplate = async (doctorProfileId, id, data) => {
  await ensureTables();
  await pool.query(
    `UPDATE doctor_prescription_templates
     SET name = ?, diagnosis = ?, notes = ?, follow_up_days = ?, is_active = ?, updated_at = NOW()
     WHERE id = ? AND doctor_profile_id = ?`,
    [
      data.name.trim(),
      data.diagnosis || null,
      data.notes || null,
      data.follow_up_days || null,
      data.is_active === false ? 0 : 1,
      id,
      doctorProfileId,
    ]
  );

  await pool.query('DELETE FROM doctor_prescription_template_assets WHERE template_id = ?', [id]);
  if (Array.isArray(data.assets) && data.assets.length > 0) {
    const assetValues = data.assets.map((a, idx) => [
      id,
      a.file_url,
      a.file_name || null,
      a.file_type === 'document' ? 'document' : 'image',
      a.mime_type || null,
      Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : idx,
    ]);
    await pool.query(
      `INSERT INTO doctor_prescription_template_assets
       (template_id, file_url, file_name, file_type, mime_type, sort_order)
       VALUES ?`,
      [assetValues]
    );
  }
};

export const deleteTemplate = async (doctorProfileId, id) => {
  await ensureTables();
  await pool.query(
    'DELETE FROM doctor_prescription_templates WHERE id = ? AND doctor_profile_id = ?',
    [id, doctorProfileId]
  );
};

export const recordTemplateUsage = async (templateId, prescriptionId) => {
  await ensureTables();
  await pool.query(
    'INSERT INTO doctor_template_usage (template_id, prescription_id) VALUES (?, ?)',
    [templateId, prescriptionId]
  );
};

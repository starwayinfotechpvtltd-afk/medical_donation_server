import { pool } from '../config/db.js';

export const getDepartments = async () => {
  const [rows] = await pool.query(
    `SELECT d.*, ds.id AS service_id, ds.service_name
     FROM departments d
     LEFT JOIN department_services ds ON ds.department_id = d.id
     WHERE d.is_active = 1
     ORDER BY d.name ASC`
  );
  return rows;
};

export const getDepartmentDetail = async (id) => {
  const [deptRows] = await pool.query('SELECT * FROM departments WHERE id = ? AND is_active = 1 LIMIT 1', [id]);
  const [serviceRows] = await pool.query('SELECT * FROM department_services WHERE department_id = ? ORDER BY service_name', [id]);
  const [doctorRows] = await pool.query(
    `SELECT dp.*, u.first_name, u.last_name, dd.is_primary
     FROM doctor_departments dd
     JOIN doctor_profiles dp ON dp.id = dd.doctor_profile_id
     JOIN users u ON u.id = dp.user_id
     WHERE dd.department_id = ?`, [id]
  );
  return { department: deptRows[0] || null, services: serviceRows, doctors: doctorRows };
};

export const createDepartment = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO departments (name, description, icon, image_url, beds, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [data.name, data.description || null, data.icon || null, data.image_url || null, data.beds || null]
  );
  return result.insertId;
};

export const updateDepartment = async (id, data) => {
  await pool.query(
    `UPDATE departments
     SET name = COALESCE(?, name), description = COALESCE(?, description), icon = COALESCE(?, icon),
         image_url = COALESCE(?, image_url), beds = COALESCE(?, beds), updated_at = NOW()
     WHERE id = ?`,
    [data.name ?? null, data.description ?? null, data.icon ?? null, data.image_url ?? null, data.beds ?? null, id]
  );
};

export const softDeleteDepartment = async (id) => {
  await pool.query('UPDATE departments SET is_active = 0, updated_at = NOW() WHERE id = ?', [id]);
};

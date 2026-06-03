import { pool } from '../config/db.js';

export const getDepartments = async () => {
  const [rows] = await pool.query(
    `SELECT d.*, COALESCE(dc.doctors, 0) AS doctors, ds.id AS service_id, ds.service_name
     FROM departments d
     LEFT JOIN (
       SELECT department_id, COUNT(DISTINCT doctor_profile_id) AS doctors
       FROM doctor_departments
       GROUP BY department_id
     ) dc ON dc.department_id = d.id
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
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO departments (name, description, icon, image_url, beds, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [data.name, data.description || null, data.icon || null, data.image_url || null, data.beds || null]
    );
    const departmentId = result.insertId;

    if (Array.isArray(data.services) && data.services.length) {
      const values = data.services.map((service) => [departmentId, service]);
      await conn.query(
        'INSERT INTO department_services (department_id, service_name) VALUES ?',
        [values]
      );
    }

    await conn.commit();
    return departmentId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const updateDepartment = async (id, data) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE departments
       SET name = COALESCE(?, name), description = COALESCE(?, description), icon = COALESCE(?, icon),
           image_url = COALESCE(?, image_url), beds = COALESCE(?, beds), updated_at = NOW()
       WHERE id = ?`,
      [data.name ?? null, data.description ?? null, data.icon ?? null, data.image_url ?? null, data.beds ?? null, id]
    );

    if (Array.isArray(data.services)) {
      await conn.query('DELETE FROM department_services WHERE department_id = ?', [id]);
      if (data.services.length) {
        const values = data.services.map((service) => [id, service]);
        await conn.query(
          'INSERT INTO department_services (department_id, service_name) VALUES ?',
          [values]
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const softDeleteDepartment = async (id) => {
  await pool.query('UPDATE departments SET is_active = 0, updated_at = NOW() WHERE id = ?', [id]);
};

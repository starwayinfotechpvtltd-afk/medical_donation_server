import { pool } from '../config/db.js';

export const getDoctors = async () => {
  const [rows] = await pool.query(`SELECT dp.*, u.first_name, u.last_name, u.phone,
      GROUP_CONCAT(d.name ORDER BY d.name SEPARATOR ', ') AS departments
    FROM doctor_profiles dp
    JOIN users u ON u.id = dp.user_id
    LEFT JOIN doctor_departments dd ON dd.doctor_profile_id = dp.id
    LEFT JOIN departments d ON d.id = dd.department_id
    GROUP BY dp.id`);
  return rows;
};

export const getDoctorById = async (id) => {
  const [rows] = await pool.query(`SELECT dp.*, u.first_name, u.last_name
    FROM doctor_profiles dp JOIN users u ON u.id = dp.user_id WHERE dp.id = ? LIMIT 1`, [id]);
  if (!rows[0]) return null;
  const [departments] = await pool.query(`SELECT d.*, dd.is_primary
    FROM doctor_departments dd JOIN departments d ON d.id = dd.department_id
    WHERE dd.doctor_profile_id = ?`, [id]);
  return { ...rows[0], departments };
};

export const assignDoctorDepartment = async (doctorId, departmentId, isPrimary = 0) => {
  await pool.query(
    'INSERT INTO doctor_departments (doctor_profile_id, department_id, is_primary, assigned_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)',
    [doctorId, departmentId, isPrimary ? 1 : 0]
  );
};

export const removeDoctorDepartment = async (doctorId, deptId) => {
  await pool.query('DELETE FROM doctor_departments WHERE doctor_profile_id = ? AND department_id = ?', [doctorId, deptId]);
};

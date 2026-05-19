import { pool } from '../config/db.js';

export const findByEmail = async (email) => {
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, email, password,
            role, status, phone, avatar_url, last_login, created_at
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

export const findByEmailForSetup = async (email) => {
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, email, password, role, status
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

export const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.status,
        u.phone,
        u.avatar_url,
        u.last_login,
        u.created_at,
        u.updated_at,
        dp.specialization,
        dp.years_of_experience,
        GROUP_CONCAT(DISTINCT d.name ORDER BY d.name SEPARATOR ', ') AS department
     FROM users u
     LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
     LEFT JOIN doctor_departments dd ON dd.doctor_profile_id = dp.id
     LEFT JOIN departments d ON d.id = dd.department_id
     WHERE u.id = ?
     GROUP BY
       u.id, u.first_name, u.last_name, u.email, u.role, u.status, u.phone,
       u.avatar_url, u.last_login, u.created_at, u.updated_at,
       dp.specialization, dp.years_of_experience
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

export const emailExists = async (email, excludeId = null) => {
  const [rows] = excludeId
    ? await pool.query('SELECT 1 FROM users WHERE email = ? AND id != ? LIMIT 1', [email, excludeId])
    : await pool.query('SELECT 1 FROM users WHERE email = ? LIMIT 1', [email]);
  return rows.length > 0;
};

export const findAllUsers = async ({ role, status, search, limit, offset }) => {
  const conditions = [];
  const params = [];

  if (role) {
    conditions.push('u.role = ?');
    params.push(role);
  }

  if (status) {
    conditions.push('u.status = ?');
    params.push(status);
  }

  if (search) {
    conditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${whereClause}`, params);
  const total = countRows[0].total;

  const [rows] = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email,
            u.role, u.status, u.phone, u.avatar_url,
            u.last_login, u.created_at
     FROM users u
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { rows, total };
};

export const createUser = async ({ first_name, last_name, email, password, role, phone = null }) => {
  const [result] = await pool.query(
    `INSERT INTO users
       (first_name, last_name, email, password, role, status, phone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())`,
    [first_name.trim(), last_name.trim(), email.toLowerCase().trim(), password, role, phone]
  );
  return { id: result.insertId };
};

export const updateUser = async (id, fields) => {
  const ALLOWED = ['first_name', 'last_name', 'email', 'role', 'status', 'phone', 'avatar_url'];

  const updates = [];
  const params = [];

  for (const key of ALLOWED) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      params.push(key === 'email' ? fields[key].toLowerCase().trim() : fields[key]);
    }
  }

  if (updates.length === 0) return false;

  params.push(id);
  await pool.query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
  return true;
};

export const softDeleteUser = async (id) => {
  const [result] = await pool.query(`UPDATE users SET status = 'inactive', updated_at = NOW() WHERE id = ?`, [id]);
  return result.affectedRows > 0;
};

export const hardDeleteUser = async (id) => {
  await pool.query('DELETE FROM doctor_profiles WHERE user_id = ?', [id]);
  await pool.query('DELETE FROM lab_technician_profiles WHERE user_id = ?', [id]);
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

export const updateLastLogin = async (id) => {
  await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
};

export const updatePassword = async (id, passwordHash) => {
  await pool.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [passwordHash, id]);
};

export const findDoctorProfile = async (userId) => {
  const [rows] = await pool.query('SELECT * FROM doctor_profiles WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0] || null;
};

export const upsertDoctorProfile = async (userId, fields) => {
  const ALLOWED = [
    'specialization', 'qualification', 'license_number', 'years_of_experience',
    'consultation_fee', 'available_days', 'available_time_start', 'available_time_end', 'image_url', 'bio',
  ];

  const columns = ['user_id'];
  const values = [userId];
  const updates = [];

  for (const key of ALLOWED) {
    if (fields[key] !== undefined) {
      columns.push(key);
      values.push(fields[key]);
      updates.push(`${key} = VALUES(${key})`);
    }
  }

  if (columns.length === 1) return false;

  await pool.query(
    `INSERT INTO doctor_profiles (${columns.join(', ')})
     VALUES (${columns.map(() => '?').join(', ')})
     ON DUPLICATE KEY UPDATE ${updates.join(', ')}, updated_at = NOW()`,
    values
  );

  return true;
};

export const findUserWithProfile = async (userId) => {
  const user = await findById(userId);
  if (!user) return null;

  let profile = null;
  if (user.role === 'doctor') {
    profile = await findDoctorProfile(userId);
  }

  return { ...user, profile };
};

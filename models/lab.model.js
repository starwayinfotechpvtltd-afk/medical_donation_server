import { pool } from '../config/db.js';

export const createLabTest = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO lab_tests
    (patient_id, patient_reg_no, doctor_profile_id, lab_tech_profile_id, appointment_id, medical_record_id, test_name, test_type, category, priority,
     status, request_date, result_file_url, notes, is_critical)
    VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'pending', CURDATE(), NULL, ?, 0)`,
    [
      data.patient_id,
      data.patient_reg_no || null,
      data.doctor_profile_id,
      data.appointment_id || null,
      data.medical_record_id || null,
      data.test_name,
      data.test_type || null,
      data.category || 'other',
      data.priority || 'routine',
      data.notes || null,
    ]
  );
  return result.insertId;
};

export const assignLabTech = async (id, profileId) => {
  await pool.query('UPDATE lab_tests SET lab_tech_profile_id = ?, status = \"in_progress\" WHERE id = ?', [profileId, id]);
};

export const saveLabResults = async (id, resultFileUrl, results) => {
  await pool.query('UPDATE lab_tests SET status = \"completed\", result_file_url = ?, updated_at = NOW() WHERE id = ?', [resultFileUrl || null, id]);
  if (Array.isArray(results) && results.length > 0) {
    const values = results.map((r) => [id, r.parameter, r.value, r.unit || null, r.normal_range || null, r.status || 'normal']);
    await pool.query('INSERT INTO lab_results (lab_test_id, parameter, value, unit, normal_range, status) VALUES ?', [values]);
  }
};

export const getLabTestById = async (id) => {
  const [tests] = await pool.query('SELECT * FROM lab_tests WHERE id = ? LIMIT 1', [id]);
  if (!tests[0]) return null;
  const [results] = await pool.query('SELECT * FROM lab_results WHERE lab_test_id = ?', [id]);
  return { ...tests[0], results };
};

export const getLabTestsByPatient = async (patientId) => {
  const [rows] = await pool.query('SELECT * FROM lab_tests WHERE patient_id = ? ORDER BY request_date DESC', [patientId]);
  return rows;
};

export const listLabTests = async ({ role, userId, status, patientRegNo, assignedProfileId }) => {
  const where = [];
  const params = [];

  if (status) {
    where.push('lt.status = ?');
    params.push(status);
  }
  if (patientRegNo) {
    where.push('lt.patient_reg_no = ?');
    params.push(patientRegNo);
  }
  if (assignedProfileId) {
    where.push('lt.lab_tech_profile_id = ?');
    params.push(assignedProfileId);
  }
  if (role === 'doctor') {
    where.push('dp.user_id = ?');
    params.push(userId);
  }
  if (role === 'lab_technician') {
    where.push('ltp.user_id = ?');
    params.push(userId);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT
      lt.id, lt.patient_id, lt.patient_reg_no, lt.doctor_profile_id, lt.lab_tech_profile_id,
      lt.appointment_id, lt.test_name, lt.test_type, lt.category, lt.priority, lt.status,
      lt.request_date, lt.result_file_url, lt.notes, lt.is_critical, lt.created_at, lt.updated_at,
      p.first_name AS patient_first_name, p.last_name AS patient_last_name, p.phone AS patient_phone,
      du.first_name AS doctor_first_name, du.last_name AS doctor_last_name,
      tu.first_name AS technician_first_name, tu.last_name AS technician_last_name,
      tu.id AS technician_user_id
     FROM lab_tests lt
     JOIN patients p ON p.id = lt.patient_id
     JOIN doctor_profiles dp ON dp.id = lt.doctor_profile_id
     JOIN users du ON du.id = dp.user_id
     LEFT JOIN lab_technician_profiles ltp ON ltp.id = lt.lab_tech_profile_id
     LEFT JOIN users tu ON tu.id = ltp.user_id
     ${whereSql}
     ORDER BY lt.request_date DESC, lt.id DESC`,
    params
  );
  return rows;
};

export const updateLabTestActive = async (id, isActive) => {
  await pool.query('UPDATE lab_tests SET is_critical = ?, updated_at = NOW() WHERE id = ?', [isActive ? 1 : 0, id]);
};

export const listLabTechnicianProfiles = async () => {
  const [rows] = await pool.query(
    `SELECT ltp.id, ltp.user_id, u.first_name, u.last_name, u.email
     FROM lab_technician_profiles ltp
     JOIN users u ON u.id = ltp.user_id
     WHERE u.role = 'lab_technician' AND u.status = 'active'
     ORDER BY u.first_name, u.last_name`
  );
  return rows;
};

export const listLabTechnicianProfilesDetailed = async () => {
  const [rows] = await pool.query(
    `SELECT
      ltp.id, ltp.user_id, ltp.lab_name, ltp.licence_number,
      ltp.certificate_image, ltp.gst_number, ltp.address, ltp.email, ltp.mobile_number,
      ltp.pan_number, ltp.pan_image, ltp.lab_profile_image, ltp.lab_time, ltp.cert_number,
      ltp.created_at, ltp.updated_at,
      u.first_name, u.last_name, u.email AS user_email, u.phone AS user_phone
     FROM lab_technician_profiles ltp
     JOIN users u ON u.id = ltp.user_id
     ORDER BY ltp.updated_at DESC, ltp.id DESC`
  );
  return rows;
};

export const createLabTechnicianProfile = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO lab_technician_profiles
      (user_id, lab_name, licence_number, certificate_image, gst_number, address, email, mobile_number, pan_number, pan_image, lab_profile_image, lab_time, cert_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.user_id,
      data.lab_name,
      data.licence_number,
      data.certificate_image || null,
      data.gst_number || null,
      data.address,
      data.email,
      data.mobile_number,
      data.pan_number || null,
      data.pan_image || null,
      data.lab_profile_image || null,
      data.lab_time || null,
      data.cert_number || null,
    ]
  );
  return result.insertId;
};

export const updateLabTechnicianProfile = async (id, data) => {
  await pool.query(
    `UPDATE lab_technician_profiles
     SET lab_name = ?, licence_number = ?, certificate_image = ?, gst_number = ?,
         address = ?, email = ?, mobile_number = ?, pan_number = ?, pan_image = ?,
         lab_profile_image = ?, lab_time = ?, cert_number = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      data.lab_name,
      data.licence_number,
      data.certificate_image || null,
      data.gst_number || null,
      data.address,
      data.email,
      data.mobile_number,
      data.pan_number || null,
      data.pan_image || null,
      data.lab_profile_image || null,
      data.lab_time || null,
      data.cert_number || null,
      id,
    ]
  );
};

export const listTechnicianDepartments = async (userId) => {
  const [rows] = await pool.query(
    `SELECT id, department_key, department_name, created_at
     FROM lab_technician_departments
     WHERE user_id = ?
     ORDER BY department_name ASC`,
    [userId]
  );
  return rows;
};

export const createTechnicianDepartment = async (userId, departmentKey, departmentName) => {
  const [result] = await pool.query(
    `INSERT INTO lab_technician_departments (user_id, department_key, department_name)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE department_name = VALUES(department_name)`,
    [userId, departmentKey, departmentName]
  );
  return result.insertId;
};

export const deleteTechnicianDepartment = async (id, userId) => {
  const [result] = await pool.query(
    'DELETE FROM lab_technician_departments WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
};

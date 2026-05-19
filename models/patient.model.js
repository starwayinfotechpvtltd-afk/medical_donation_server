import { pool } from '../config/db.js';

const generateRegistrationNo = (firstName = 'PAT', phone = '') => {
  const prefix = String(firstName).replace(/\s+/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
  const digits = String(phone).replace(/\D/g, '');
  const phone4 = digits.slice(-4).padStart(4, '0');
  const randomPart = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  return `PT${prefix}${phone4}${randomPart.slice(0, 8)}`;
};

export const createPatient = async (data) => {
  const registrationNo = generateRegistrationNo(data.first_name, data.phone);
  const [result] = await pool.query(
    `INSERT INTO patients
    (registration_no, first_name, last_name, email, phone, date_of_birth, gender, blood_type, address, city, state, country,
     allergies, chronic_conditions, emergency_contact, emergency_phone, insurance_provider, insurance_number,
     avatar_url, registration_status, dashboard_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NOW(), NOW())`,
    [
      registrationNo, data.first_name, data.last_name, data.email, data.phone || null, data.date_of_birth || null,
      data.gender || null, data.blood_type || null, data.address || null, data.city || null,
      data.state || null, data.country || null, data.allergies || null, data.chronic_conditions || null,
      data.emergency_contact || null, data.emergency_phone || null, data.insurance_provider || null,
      data.insurance_number || null, data.avatar_url || null,
    ]
  );
  return result.insertId;
};

export const createPatientAuth = async (patientId, password) => {
  await pool.query(
    'INSERT INTO patient_auth (patient_id, password, last_login) VALUES (?, ?, NULL)',
    [patientId, password]
  );
};

export const findPatientByEmailWithAuth = async (email) => {
  const [rows] = await pool.query(
    `SELECT p.*, pa.password
     FROM patients p
     JOIN patient_auth pa ON pa.patient_id = p.id
     WHERE p.email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

export const findPatientByEmailForSetup = async (email) => {
  const [rows] = await pool.query(
    `SELECT p.*, pa.password
     FROM patients p
     LEFT JOIN patient_auth pa ON pa.patient_id = p.id
     WHERE p.email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

export const findPatientByEmail = async (email) => {
  const [rows] = await pool.query(
    'SELECT * FROM patients WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
};

export const findPatientByIdForAuth = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM patients WHERE id = ? AND dashboard_enabled = 1 LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

export const updatePatientFromAppointment = async (patientId, data) => {
  await pool.query(
    `UPDATE patients
     SET
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      phone = COALESCE(?, phone),
      date_of_birth = COALESCE(?, date_of_birth),
      gender = COALESCE(?, gender),
      address = COALESCE(?, address),
      updated_at = NOW()
     WHERE id = ?`,
    [
      data.first_name || null,
      data.last_name || null,
      data.phone || null,
      data.date_of_birth || null,
      data.gender || null,
      data.address || null,
      patientId,
    ]
  );
};

export const savePatientRefreshToken = async (patientId, token, expiresAt) => {
  await pool.query(
    'INSERT INTO patient_refresh_tokens (patient_id, token, expires_at) VALUES (?, ?, ?)',
    [patientId, token, expiresAt]
  );
};

export const updatePatientLastLogin = async (patientId) => {
  await pool.query('UPDATE patient_auth SET last_login = NOW() WHERE patient_id = ?', [patientId]);
};

export const updatePatientPassword = async (patientId, passwordHash) => {
  await pool.query(
    `INSERT INTO patient_auth (patient_id, password, last_login)
     VALUES (?, ?, NULL)
     ON DUPLICATE KEY UPDATE password = VALUES(password)`,
    [patientId, passwordHash]
  );
};

export const getPatientDashboardData = async (patientId) => {
  const [patientRows, apptRows, prescriptionRows, labRows, recordRows] = await Promise.all([
    pool.query('SELECT * FROM patients WHERE id = ?', [patientId]),
    pool.query(`SELECT a.*, dp.specialization, u.first_name, u.last_name, d.name as department
      FROM appointments a
      JOIN doctor_profiles dp ON dp.id = a.doctor_profile_id
      JOIN users u ON u.id = dp.user_id
      LEFT JOIN departments d ON d.id = a.department_id
      WHERE a.patient_id = ? ORDER BY a.scheduled_date DESC, a.scheduled_time DESC LIMIT 5`, [patientId]),
    pool.query(`SELECT p.*, pm.id AS med_id, pm.medicine_name, pm.dosage, pm.frequency, pm.duration, pm.route,
      pm.instructions, pm.side_effects, pm.refills_allowed
      FROM prescriptions p
      JOIN prescription_medicines pm ON pm.prescription_id = p.id
      WHERE p.patient_id = ? AND p.is_active = 1
      ORDER BY p.date_issued DESC`, [patientId]),
    pool.query(`SELECT lt.*, lr.parameter, lr.value, lr.unit, lr.status AS result_status
      FROM lab_tests lt
      LEFT JOIN lab_results lr ON lr.lab_test_id = lt.id
      WHERE lt.patient_id = ? ORDER BY lt.request_date DESC LIMIT 50`, [patientId]),
    pool.query('SELECT * FROM medical_records WHERE patient_id = ? ORDER BY visit_date DESC LIMIT 3', [patientId]),
  ]);

  return {
    patient: patientRows[0][0] || null,
    appointments: apptRows[0],
    prescriptions: prescriptionRows[0],
    lab_tests: labRows[0],
    medical_records: recordRows[0],
  };
};

export const getPatientMedicalHistory = async (patientId) => {
  const [rows] = await pool.query(
    `SELECT mr.*,
        dp.specialization AS doctor_specialization,
        u.first_name AS doctor_first_name,
        u.last_name AS doctor_last_name,
        d.name AS department_name
     FROM medical_records mr
     LEFT JOIN doctor_profiles dp ON dp.id = mr.doctor_profile_id
     LEFT JOIN users u ON u.id = dp.user_id
     LEFT JOIN departments d ON d.id = mr.department_id
     WHERE mr.patient_id = ?
     ORDER BY mr.visit_date DESC, mr.id DESC`,
    [patientId]
  );
  return rows;
};

export const getPatientLabReports = async (patientId) => {
  const [rows] = await pool.query(
    `SELECT lt.*,
        dp.specialization AS doctor_specialization,
        u.first_name AS doctor_first_name,
        u.last_name AS doctor_last_name,
        tech_u.first_name AS technician_first_name,
        tech_u.last_name AS technician_last_name,
        lr.id AS result_id,
        lr.parameter,
        lr.value,
        lr.unit,
        lr.normal_range,
        lr.status AS result_status
     FROM lab_tests lt
     LEFT JOIN doctor_profiles dp ON dp.id = lt.doctor_profile_id
     LEFT JOIN users u ON u.id = dp.user_id
     LEFT JOIN lab_technician_profiles ltp ON ltp.id = lt.lab_tech_profile_id
     LEFT JOIN users tech_u ON tech_u.id = ltp.user_id
     LEFT JOIN lab_results lr ON lr.lab_test_id = lt.id
     WHERE lt.patient_id = ?
     ORDER BY lt.request_date DESC, lt.id DESC, lr.id ASC`,
    [patientId]
  );
  return rows;
};

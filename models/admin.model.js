import { pool } from '../config/db.js';

export const listPatients = async (status) => {
  const [rows] = status
    ? await pool.query('SELECT * FROM patients WHERE registration_status = ? ORDER BY created_at DESC', [status])
    : await pool.query('SELECT * FROM patients ORDER BY created_at DESC');
  return rows;
};

export const approvePatient = async (id, userId) => {
  await pool.query(`UPDATE patients
    SET registration_status = 'approved', dashboard_enabled = 1, approved_by = ?, approved_at = NOW(), updated_at = NOW()
    WHERE id = ?`, [userId, id]);
};

export const getPatientById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM patients WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

export const getPatientAuthByPatientId = async (patientId) => {
  const [rows] = await pool.query('SELECT patient_id FROM patient_auth WHERE patient_id = ? LIMIT 1', [patientId]);
  return rows[0] || null;
};

export const createPatientAuthRecord = async (patientId, passwordHash) => {
  await pool.query('INSERT INTO patient_auth (patient_id, password, last_login) VALUES (?, ?, NULL)', [patientId, passwordHash]);
};

export const rejectPatient = async (id, reason) => {
  await pool.query(`UPDATE patients
    SET registration_status = 'rejected', rejection_reason = ?, updated_at = NOW()
    WHERE id = ?`, [reason || null, id]);
};

export const deactivatePatient = async (id) => {
  await pool.query(`UPDATE patients
    SET registration_status = 'suspended', dashboard_enabled = 0, updated_at = NOW()
    WHERE id = ?`, [id]);
};

export const deletePatient = async (id) => {
  await pool.query('DELETE FROM patients WHERE id = ?', [id]);
};

export const getPatientAdminDetail = async (id) => {
  const [patients] = await pool.query('SELECT * FROM patients WHERE id = ? LIMIT 1', [id]);
  if (!patients[0]) return null;
  const [[appt]] = await pool.query('SELECT COUNT(*) AS count FROM appointments WHERE patient_id = ?', [id]);
  const [[rx]] = await pool.query('SELECT COUNT(*) AS count FROM prescriptions WHERE patient_id = ?', [id]);
  const [[lab]] = await pool.query('SELECT COUNT(*) AS count FROM lab_tests WHERE patient_id = ?', [id]);

  const [appointments] = await pool.query(
    `SELECT a.*,
      dp.specialization AS doctor_specialization,
      u.first_name AS doctor_first_name,
      u.last_name AS doctor_last_name,
      d.name AS department_name
     FROM appointments a
     LEFT JOIN doctor_profiles dp ON dp.id = a.doctor_profile_id
     LEFT JOIN users u ON u.id = dp.user_id
     LEFT JOIN departments d ON d.id = a.department_id
     WHERE a.patient_id = ?
     ORDER BY a.scheduled_date DESC, a.scheduled_time DESC, a.id DESC`,
    [id]
  );

  const [prescriptions] = await pool.query(
    `SELECT p.*,
      dp.specialization AS doctor_specialization,
      u.first_name AS doctor_first_name,
      u.last_name AS doctor_last_name
     FROM prescriptions p
     LEFT JOIN doctor_profiles dp ON dp.id = p.doctor_profile_id
     LEFT JOIN users u ON u.id = dp.user_id
     WHERE p.patient_id = ?
     ORDER BY p.date_issued DESC, p.id DESC`,
    [id]
  );

  const [labTests] = await pool.query(
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
    [id]
  );

  return {
    ...patients[0],
    appointments_count: appt.count,
    prescriptions_count: rx.count,
    lab_tests_count: lab.count,
    appointments,
    prescriptions,
    lab_tests: labTests,
  };
};

export const getActivityLogs = async ({ actorType, action, entityType, limit = 50, offset = 0 }) => {
  const conditions = [];
  const params = [];
  if (actorType) { conditions.push('actor_type = ?'); params.push(actorType); }
  if (action) { conditions.push('action = ?'); params.push(action); }
  if (entityType) { conditions.push('entity_type = ?'); params.push(entityType); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM activity_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit, 10), parseInt(offset, 10)]);
  return rows;
};

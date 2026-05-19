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

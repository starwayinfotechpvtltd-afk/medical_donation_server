import { pool } from '../config/db.js';

export const createAppointment = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO appointments
    (patient_id, doctor_profile_id, department_id, scheduled_date, scheduled_time, duration_minutes, type, disease, reason, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
    [data.patient_id, data.doctor_profile_id || null, data.department_id, data.scheduled_date, data.scheduled_time, data.duration_minutes || 30, data.type || 'in_person', data.disease || null, data.reason || null, data.notes || null]
  );
  return result.insertId;
};

export const listAppointmentsForStaff = async () => {
  const [rows] = await pool.query(`SELECT a.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
      p.registration_no AS patient_registration_no, p.email AS patient_email, p.phone AS patient_phone,
      p.blood_type AS patient_blood_type, p.date_of_birth AS patient_date_of_birth, p.gender AS patient_gender,
      p.address AS patient_address, p.city AS patient_city, p.state AS patient_state, p.country AS patient_country,
      p.chronic_conditions AS patient_chronic_conditions, p.emergency_contact AS patient_emergency_contact,
      p.emergency_phone AS patient_emergency_phone, p.emergency_address AS patient_emergency_address,
      u.first_name AS doctor_first_name, u.last_name AS doctor_last_name, d.name AS department_name
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN doctor_profiles dp ON dp.id = a.doctor_profile_id
    LEFT JOIN users u ON u.id = dp.user_id
    LEFT JOIN departments d ON d.id = a.department_id
    ORDER BY a.scheduled_date DESC, a.scheduled_time DESC`);
  return rows;
};

export const listAppointmentsForDoctor = async (doctorProfileId) => {
  const [rows] = await pool.query(
    `SELECT a.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
      p.registration_no AS patient_registration_no, p.email AS patient_email, p.phone AS patient_phone,
      p.blood_type AS patient_blood_type, p.date_of_birth AS patient_date_of_birth, p.gender AS patient_gender,
      p.address AS patient_address, p.city AS patient_city, p.state AS patient_state, p.country AS patient_country,
      p.chronic_conditions AS patient_chronic_conditions, p.emergency_contact AS patient_emergency_contact,
      p.emergency_phone AS patient_emergency_phone, p.emergency_address AS patient_emergency_address,
      u.first_name AS doctor_first_name, u.last_name AS doctor_last_name, d.name AS department_name
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN doctor_profiles dp ON dp.id = a.doctor_profile_id
    LEFT JOIN users u ON u.id = dp.user_id
    LEFT JOIN departments d ON d.id = a.department_id
    WHERE a.doctor_profile_id = ?
       OR (a.status = 'pending' AND a.doctor_profile_id IS NULL)
    ORDER BY a.scheduled_date DESC, a.scheduled_time DESC`,
    [doctorProfileId]
  );
  return rows;
};

export const listAppointmentsForPatient = async (patientId) => {
  const [rows] = await pool.query(
    `SELECT a.*,
        dp.specialization AS doctor_specialization,
        dp.qualification AS doctor_qualification,
        dp.years_of_experience AS doctor_experience,
        dp.consultation_fee AS doctor_consultation_fee,
        u.first_name AS doctor_first_name,
        u.last_name AS doctor_last_name,
        u.phone AS doctor_phone,
        d.name AS department_name
     FROM appointments a
     LEFT JOIN doctor_profiles dp ON dp.id = a.doctor_profile_id
     LEFT JOIN users u ON u.id = dp.user_id
     LEFT JOIN departments d ON d.id = a.department_id
     WHERE a.patient_id = ?
     ORDER BY a.scheduled_date DESC, a.scheduled_time DESC`,
    [patientId]
  );
  return rows;
};

export const approveAppointment = async (id, reviewerId, doctorProfileId = null) => {
  const [result] = await pool.query(
    `UPDATE appointments
     SET status = 'confirmed',
         reviewed_by = ?,
         reviewed_at = NOW(),
         doctor_profile_id = COALESCE(doctor_profile_id, ?),
         updated_at = NOW()
     WHERE id = ?
       AND status = 'pending'
       AND (? IS NULL OR doctor_profile_id IS NULL OR doctor_profile_id = ?)`,
    [reviewerId, doctorProfileId, id, doctorProfileId, doctorProfileId]
  );
  return result.affectedRows > 0;
};

export const rejectAppointment = async (id, reviewerId, reason, doctorProfileId = null) => {
  const [result] = await pool.query(`UPDATE appointments
    SET status = 'cancelled', reviewed_by = ?, reviewed_at = NOW(), cancellation_reason = ?,
        cancelled_by_type = 'user', cancelled_by_user = ?, updated_at = NOW()
    WHERE id = ?
      AND status = 'pending'
      AND (? IS NULL OR doctor_profile_id IS NULL OR doctor_profile_id = ?)`, [reviewerId, reason || null, reviewerId, id, doctorProfileId, doctorProfileId]);
  return result.affectedRows > 0;
};

export const cancelAppointmentByPatient = async (id, patientId, reason) => {
  await pool.query(`UPDATE appointments
    SET status = 'cancelled', cancellation_reason = ?, cancelled_by_type = 'patient',
        cancelled_by_patient = ?, updated_at = NOW()
    WHERE id = ? AND patient_id = ?`, [reason || null, patientId, id, patientId]);
};

export const moveAppointmentNextDate = async (id, doctorProfileId, nextDate, nextTime, note) => {
  await pool.query(
    `UPDATE appointments
     SET scheduled_date = ?, scheduled_time = ?, status = 'confirmed',
         notes = CONCAT(COALESCE(notes, ''), ?), updated_at = NOW()
     WHERE id = ? AND doctor_profile_id = ?`,
    [nextDate, nextTime, note ? `\n[Next Date] ${note}` : '', id, doctorProfileId]
  );
};

export const dischargeAppointment = async (id, doctorProfileId, note) => {
  await pool.query(
    `UPDATE appointments
     SET status = 'completed',
         notes = CONCAT(COALESCE(notes, ''), ?), updated_at = NOW()
     WHERE id = ? AND doctor_profile_id = ?`,
    [note ? `\n[Discharged] ${note}` : '\n[Discharged]', id, doctorProfileId]
  );
};


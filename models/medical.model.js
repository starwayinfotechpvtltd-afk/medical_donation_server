import { pool } from '../config/db.js';

export const createPrescriptionWithMedicines = async (data) => {
  const [header] = await pool.query(
    `INSERT INTO prescriptions
    (patient_id, patient_reg_no, doctor_profile_id, medical_record_id, appointment_id, date_issued, valid_until, follow_up_date, notes, is_active)
    VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, 1)`,
    [data.patient_id, data.patient_reg_no || null, data.doctor_profile_id, data.medical_record_id || null, data.appointment_id || null, data.valid_until || null, data.follow_up_date || null, data.notes || null]
  );

  if (Array.isArray(data.medicines) && data.medicines.length > 0) {
    const values = data.medicines.map((m) => [header.insertId, m.medicine_name, m.dosage || null, m.frequency || null, m.duration || null, m.route || 'oral', m.instructions || null, m.side_effects || null, m.refills_allowed || 0]);
    await pool.query(
      `INSERT INTO prescription_medicines
      (prescription_id, medicine_name, dosage, frequency, duration, route, instructions, side_effects, refills_allowed)
      VALUES ?`,
      [values]
    );
  }

  return header.insertId;
};

export const getPrescriptionById = async (id) => {
  const [rows] = await pool.query(`SELECT
      p.id AS prescription_id, p.*,
      pm.id AS medicine_id, pm.medicine_name, pm.dosage, pm.frequency, pm.duration, pm.route, pm.instructions, pm.side_effects, pm.refills_allowed
    FROM prescriptions p
    LEFT JOIN prescription_medicines pm ON pm.prescription_id = p.id
    WHERE p.id = ?`, [id]);
  return rows;
};

export const getPatientPrescriptions = async (patientId) => {
  const [rows] = await pool.query(
    `SELECT
        p.id AS prescription_id, p.*,
        pm.id AS medicine_id, pm.medicine_name, pm.dosage, pm.frequency, pm.duration, pm.route, pm.instructions, pm.side_effects, pm.refills_allowed,
        dp.specialization AS doctor_specialization,
        u.first_name AS doctor_first_name,
        u.last_name AS doctor_last_name
     FROM prescriptions p
     LEFT JOIN prescription_medicines pm ON pm.prescription_id = p.id
     LEFT JOIN doctor_profiles dp ON dp.id = p.doctor_profile_id
     LEFT JOIN users u ON u.id = dp.user_id
     WHERE p.patient_id = ?
     ORDER BY p.date_issued DESC, p.id DESC`,
    [patientId]
  );
  return rows;
};

export const deletePrescriptionMedicine = async (prescriptionId, medicineId) => {
  await pool.query('DELETE FROM prescription_medicines WHERE id = ? AND prescription_id = ?', [medicineId, prescriptionId]);
};

export const getDoctorPrescriptions = async (doctorProfileId, filters = {}) => {
  let where = '';
  const params = [doctorProfileId];
  if (filters.patientId) {
    where += ' AND p.patient_id = ?';
    params.push(filters.patientId);
  }
  if (filters.patientRegNo) {
    where += ' AND p.patient_reg_no = ?';
    params.push(filters.patientRegNo);
  }
  const [rows] = await pool.query(
    `SELECT
        p.id AS prescription_id, p.*,
        pm.id AS medicine_id, pm.medicine_name, pm.dosage, pm.frequency, pm.duration, pm.route, pm.instructions, pm.side_effects, pm.refills_allowed,
        pa.first_name AS patient_first_name,
        pa.last_name AS patient_last_name,
        pa.email AS patient_email,
        pa.phone AS patient_phone,
        pa.gender AS patient_gender,
        pa.date_of_birth AS patient_date_of_birth,
        pa.blood_type AS patient_blood_type,
        dtu.template_id AS template_id,
        t.name AS template_name,
        (
          SELECT a.file_url
          FROM doctor_prescription_template_assets a
          WHERE a.template_id = dtu.template_id AND a.file_type = 'image'
          ORDER BY a.sort_order ASC, a.id ASC
          LIMIT 1
        ) AS template_image_url
     FROM prescriptions p
     LEFT JOIN prescription_medicines pm ON pm.prescription_id = p.id
     LEFT JOIN doctor_template_usage dtu ON dtu.prescription_id = p.id
     LEFT JOIN doctor_prescription_templates t ON t.id = dtu.template_id
     JOIN patients pa ON pa.id = p.patient_id
     WHERE p.doctor_profile_id = ?${where}
     ORDER BY p.date_issued DESC, p.id DESC`,
    params
  );
  return rows;
};

export const updatePrescriptionWithMedicines = async (prescriptionId, doctorProfileId, data) => {
  await pool.query(
    `UPDATE prescriptions
     SET follow_up_date = ?, notes = ?, updated_at = NOW()
     WHERE id = ? AND doctor_profile_id = ?`,
    [data.follow_up_date || null, data.notes || null, prescriptionId, doctorProfileId]
  );

  await pool.query('DELETE FROM prescription_medicines WHERE prescription_id = ?', [prescriptionId]);

  if (Array.isArray(data.medicines) && data.medicines.length > 0) {
    const values = data.medicines.map((m) => [
      prescriptionId,
      m.medicine_name,
      m.dosage || null,
      m.frequency || null,
      m.duration || null,
      m.route || 'oral',
      m.instructions || null,
      m.side_effects || null,
      m.refills_allowed || 0,
    ]);
    await pool.query(
      `INSERT INTO prescription_medicines
      (prescription_id, medicine_name, dosage, frequency, duration, route, instructions, side_effects, refills_allowed)
      VALUES ?`,
      [values]
    );
  }
};

export const deletePrescription = async (prescriptionId, doctorProfileId) => {
  const [result] = await pool.query(
    'DELETE FROM prescriptions WHERE id = ? AND doctor_profile_id = ?',
    [prescriptionId, doctorProfileId]
  );
  return result.affectedRows || 0;
};

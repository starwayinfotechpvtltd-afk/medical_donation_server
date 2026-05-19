import * as model from '../models/medical.model.js';
import * as doctorMedicationModel from '../models/doctorMedication.model.js';
import * as templateModel from '../models/prescriptionTemplate.model.js';
import { pool } from '../config/db.js';
import { sendSuccess } from '../utils/response.js';
import AppError from '../utils/AppError.js';
import { fireAndForgetActivity } from '../utils/activityLogger.js';

const groupPrescriptionRows = (rows) => {
  const map = new Map();
  for (const row of rows) {
    const prescriptionId = row.prescription_id || row.id;
    if (!map.has(prescriptionId)) {
      map.set(prescriptionId, {
        id: prescriptionId,
        patient_id: row.patient_id,
        patient_reg_no: row.patient_reg_no || null,
        doctor_profile_id: row.doctor_profile_id,
        medical_record_id: row.medical_record_id,
        appointment_id: row.appointment_id,
        date_issued: row.date_issued,
        valid_until: row.valid_until,
        follow_up_date: row.follow_up_date,
        notes: row.notes,
        is_active: row.is_active,
        template_id: row.template_id || null,
        template_name: row.template_name || null,
        template_image_url: row.template_image_url || null,
        doctor_profile_id: row.doctor_profile_id || null,
        doctor_first_name: row.doctor_first_name || null,
        doctor_last_name: row.doctor_last_name || null,
        doctor_specialization: row.doctor_specialization || null,
        patient_email: row.patient_email || null,
        patient_phone: row.patient_phone || null,
        patient_gender: row.patient_gender || null,
        patient_date_of_birth: row.patient_date_of_birth || null,
        patient_blood_type: row.patient_blood_type || null,
        medicines: [],
      });
    }
    if (row.medicine_id) {
      map.get(prescriptionId).medicines.push({
        id: row.medicine_id,
        medicine_name: row.medicine_name,
        dosage: row.dosage,
        frequency: row.frequency,
        duration: row.duration,
        route: row.route,
        instructions: row.instructions,
        side_effects: row.side_effects,
        refills_allowed: row.refills_allowed,
      });
    }
  }
  return [...map.values()];
};

export const createPrescription = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    const patient = await resolvePatient({ patientId: req.body.patient_id, patientRegNo: req.body.patient_reg_no });
    if (!patient) return next(new AppError('Valid patient_reg_no (or patient_id) is required.', 400));
    if (!Array.isArray(req.body.medicines) || req.body.medicines.length === 0) {
      return next(new AppError('At least one medicine is required.', 400));
    }

    const id = await model.createPrescriptionWithMedicines({
      ...req.body,
      patient_id: patient.id,
      patient_reg_no: patient.registration_no,
      doctor_profile_id: doctorProfileId,
    });

    const templateId = req.body.template_id ? parseInt(req.body.template_id, 10) : null;
    if (templateId) {
      const template = await templateModel.getTemplateById(doctorProfileId, templateId);
      if (!template) return next(new AppError('Template not found.', 404));
      await templateModel.recordTemplateUsage(templateId, id);
    }

    fireAndForgetActivity({ actorType: 'user', actorId: req.user.sub, action: 'prescription_created', entityType: 'prescriptions', entityId: id, req });
    return sendSuccess(res, { statusCode: 201, message: 'Prescription created successfully.', data: { id } });
  } catch (err) { next(err); }
};

export const getPrescription = async (req, res, next) => {
  try {
    const rows = await model.getPrescriptionById(parseInt(req.params.id, 10));
    return sendSuccess(res, { message: 'Prescription fetched successfully.', data: groupPrescriptionRows(rows)[0] || null });
  } catch (err) { next(err); }
};

export const getPatientPrescriptions = async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    if (req.patient && req.patient.id !== patientId) return next(new AppError('Forbidden', 403));
    const rows = await model.getPatientPrescriptions(patientId);
    return sendSuccess(res, { message: 'Prescriptions fetched successfully.', data: groupPrescriptionRows(rows) });
  } catch (err) { next(err); }
};

export const deleteMedicine = async (req, res, next) => {
  try {
    await model.deletePrescriptionMedicine(parseInt(req.params.id, 10), parseInt(req.params.medicineId, 10));
    return sendSuccess(res, { message: 'Prescription medicine deleted successfully.' });
  } catch (err) { next(err); }
};

const getDoctorProfileIdByUserId = async (userId) => {
  const [rows] = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0]?.id || null;
};

const resolvePatient = async ({ patientId, patientRegNo }) => {
  if (patientRegNo) {
    const [rows] = await pool.query('SELECT id, registration_no FROM patients WHERE registration_no = ? LIMIT 1', [String(patientRegNo).trim()]);
    return rows[0] || null;
  }
  if (patientId) {
    const [rows] = await pool.query('SELECT id, registration_no FROM patients WHERE id = ? LIMIT 1', [parseInt(patientId, 10)]);
    return rows[0] || null;
  }
  return null;
};

export const listDoctorPrescriptions = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));

    const patientId = req.query.patient_id ? parseInt(req.query.patient_id, 10) : null;
    const patientRegNo = req.query.patient_reg_no ? String(req.query.patient_reg_no).trim() : null;
    const rows = await model.getDoctorPrescriptions(doctorProfileId, { patientId, patientRegNo });
    return sendSuccess(res, { message: 'Doctor prescriptions fetched successfully.', data: groupPrescriptionRows(rows) });
  } catch (err) { next(err); }
};

export const createPrescriptionFromTemplate = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));

    const templateId = parseInt(req.body.template_id, 10);
    const patient = await resolvePatient({ patientId: req.body.patient_id, patientRegNo: req.body.patient_reg_no });
    if (!templateId || !patient) {
      return next(new AppError('template_id and patient_reg_no (or patient_id) are required.', 400));
    }

    const template = await templateModel.getTemplateById(doctorProfileId, templateId);
    if (!template) return next(new AppError('Template not found.', 404));

    const medicines = (template.medicines || []).map((m) => ({
      medicine_name: m.medicine_name,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      route: m.route,
      instructions: m.instructions,
    }));

    const id = await model.createPrescriptionWithMedicines({
      patient_id: patient.id,
      patient_reg_no: patient.registration_no,
      doctor_profile_id: doctorProfileId,
      appointment_id: req.body.appointment_id || null,
      valid_until: req.body.valid_until || null,
      follow_up_date: req.body.follow_up_date || null,
      notes: req.body.notes || template.notes || null,
      medicines,
    });

    await templateModel.recordTemplateUsage(templateId, id);

    fireAndForgetActivity({
      actorType: 'user',
      actorId: req.user.sub,
      action: 'prescription_created_from_template',
      entityType: 'prescriptions',
      entityId: id,
      req,
    });

    return sendSuccess(res, { statusCode: 201, message: 'Prescription created from template.', data: { id } });
  } catch (err) { next(err); }
};

export const updatePrescription = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    const prescriptionId = parseInt(req.params.id, 10);
    if (!prescriptionId) return next(new AppError('Invalid prescription id.', 400));
    if (!Array.isArray(req.body.medicines) || req.body.medicines.length === 0) {
      return next(new AppError('At least one medicine is required.', 400));
    }

    await model.updatePrescriptionWithMedicines(prescriptionId, doctorProfileId, {
      follow_up_date: req.body.follow_up_date || null,
      notes: req.body.notes || null,
      medicines: req.body.medicines.filter((m) => m && String(m.medicine_name || '').trim()),
    });

    return sendSuccess(res, { message: 'Prescription updated successfully.' });
  } catch (err) { next(err); }
};

export const deletePrescription = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    const prescriptionId = parseInt(req.params.id, 10);
    if (!prescriptionId) return next(new AppError('Invalid prescription id.', 400));

    const affected = await model.deletePrescription(prescriptionId, doctorProfileId);
    if (!affected) return next(new AppError('Prescription not found.', 404));

    return sendSuccess(res, { message: 'Prescription deleted successfully.' });
  } catch (err) { next(err); }
};

export const listDoctorMedications = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    const rows = await doctorMedicationModel.listDoctorMedications(doctorProfileId);
    return sendSuccess(res, { message: 'Medications fetched successfully.', data: rows });
  } catch (err) { next(err); }
};

export const createDoctorMedication = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    if (!req.body.name || !String(req.body.name).trim()) return next(new AppError('Medication name is required.', 400));
    const id = await doctorMedicationModel.createDoctorMedication(doctorProfileId, req.body);
    return sendSuccess(res, { statusCode: 201, message: 'Medication created successfully.', data: { id } });
  } catch (err) { next(err); }
};

export const updateDoctorMedication = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    if (!req.body.name || !String(req.body.name).trim()) return next(new AppError('Medication name is required.', 400));
    await doctorMedicationModel.updateDoctorMedication(doctorProfileId, parseInt(req.params.id, 10), req.body);
    return sendSuccess(res, { message: 'Medication updated successfully.' });
  } catch (err) { next(err); }
};

export const deleteDoctorMedication = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    await doctorMedicationModel.deleteDoctorMedication(doctorProfileId, parseInt(req.params.id, 10));
    return sendSuccess(res, { message: 'Medication deleted successfully.' });
  } catch (err) { next(err); }
};

export const listDoctorTemplates = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    const rows = await templateModel.listTemplates(doctorProfileId);
    return sendSuccess(res, { message: 'Templates fetched successfully.', data: rows });
  } catch (err) { next(err); }
};

export const createDoctorTemplate = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    if (!req.body.name || !String(req.body.name).trim()) return next(new AppError('Template name is required.', 400));
    const id = await templateModel.createTemplate(doctorProfileId, req.body);
    return sendSuccess(res, { statusCode: 201, message: 'Template created successfully.', data: { id } });
  } catch (err) { next(err); }
};

export const updateDoctorTemplate = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    if (!req.body.name || !String(req.body.name).trim()) return next(new AppError('Template name is required.', 400));
    await templateModel.updateTemplate(doctorProfileId, parseInt(req.params.id, 10), req.body);
    return sendSuccess(res, { message: 'Template updated successfully.' });
  } catch (err) { next(err); }
};

export const deleteDoctorTemplate = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    await templateModel.deleteTemplate(doctorProfileId, parseInt(req.params.id, 10));
    return sendSuccess(res, { message: 'Template deleted successfully.' });
  } catch (err) { next(err); }
};

export const uploadTemplateAsset = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    if (!req.file) return next(new AppError('File is required.', 400));

    const isImage = (req.file.mimetype || '').startsWith('image/');
    const fileUrl = `/uploads/medical/${req.file.filename}`;
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Template asset uploaded successfully.',
      data: {
        file_url: fileUrl,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype,
        file_type: isImage ? 'image' : 'document',
      },
    });
  } catch (err) { next(err); }
};

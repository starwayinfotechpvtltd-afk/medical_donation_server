import { pool } from '../config/db.js';
import * as model from '../models/lab.model.js';
import { sendSuccess } from '../utils/response.js';
import AppError from '../utils/AppError.js';
import { fireAndForgetActivity } from '../utils/activityLogger.js';

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

export const createLabTest = async (req, res, next) => {
  try {
    const [doctorRows] = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = ? LIMIT 1', [req.user.sub]);
    if (!doctorRows[0]) return next(new AppError('Doctor profile not found.', 404));
    const patient = await resolvePatient({ patientId: req.body.patient_id, patientRegNo: req.body.patient_reg_no });
    if (!patient) return next(new AppError('Valid patient_reg_no (or patient_id) is required.', 400));

    const id = await model.createLabTest({
      ...req.body,
      patient_id: patient.id,
      patient_reg_no: patient.registration_no,
      doctor_profile_id: doctorRows[0].id,
    });
    return sendSuccess(res, { statusCode: 201, message: 'Lab test created successfully.', data: { id } });
  } catch (err) { next(err); }
};

export const assignLabTech = async (req, res, next) => {
  try {
    await model.assignLabTech(parseInt(req.params.id, 10), req.body.lab_tech_profile_id);
    return sendSuccess(res, { message: 'Lab technician assigned successfully.' });
  } catch (err) { next(err); }
};

export const uploadLabResults = async (req, res, next) => {
  try {
    await model.saveLabResults(parseInt(req.params.id, 10), req.body.result_file_url, req.body.results || []);
    fireAndForgetActivity({ actorType: 'user', actorId: req.user.sub, action: 'lab_result_uploaded', entityType: 'lab_tests', entityId: parseInt(req.params.id, 10), req });
    return sendSuccess(res, { message: 'Lab results uploaded successfully.' });
  } catch (err) { next(err); }
};

export const getLabTest = async (req, res, next) => {
  try {
    const data = await model.getLabTestById(parseInt(req.params.id, 10));
    if (!data) return next(new AppError('Lab test not found.', 404));
    return sendSuccess(res, { message: 'Lab test fetched successfully.', data });
  } catch (err) { next(err); }
};

export const getPatientLabTests = async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    if (req.patient && req.patient.id !== patientId) return next(new AppError('Forbidden', 403));
    const data = await model.getLabTestsByPatient(patientId);
    return sendSuccess(res, { message: 'Lab tests fetched successfully.', data });
  } catch (err) { next(err); }
};

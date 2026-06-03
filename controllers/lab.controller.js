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
    if (req.user.role === 'doctor') {
      const [rows] = await pool.query(
        `SELECT lt.id
         FROM lab_tests lt
         JOIN doctor_profiles dp ON dp.id = lt.doctor_profile_id
         WHERE lt.id = ? AND dp.user_id = ?
         LIMIT 1`,
        [parseInt(req.params.id, 10), req.user.sub]
      );
      if (!rows[0]) return next(new AppError('You can only assign technicians for your own tests.', 403));
    }
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

export const listLabTests = async (req, res, next) => {
  try {
    const data = await model.listLabTests({
      role: req.user.role,
      userId: req.user.sub,
      status: req.query.status,
      patientRegNo: req.query.patient_reg_no,
      assignedProfileId: req.query.lab_tech_profile_id ? parseInt(req.query.lab_tech_profile_id, 10) : undefined,
    });
    return sendSuccess(res, { message: 'Lab tests fetched successfully.', data });
  } catch (err) { next(err); }
};

export const toggleCritical = async (req, res, next) => {
  try {
    await model.updateLabTestActive(parseInt(req.params.id, 10), !!req.body.is_critical);
    return sendSuccess(res, { message: 'Lab test critical flag updated successfully.' });
  } catch (err) { next(err); }
};

export const listLabTechnicians = async (_req, res, next) => {
  try {
    const data = await model.listLabTechnicianProfiles();
    return sendSuccess(res, { message: 'Lab technicians fetched successfully.', data });
  } catch (err) { next(err); }
};

export const listLabTechnicianProfiles = async (_req, res, next) => {
  try {
    const data = await model.listLabTechnicianProfilesDetailed();
    return sendSuccess(res, { message: 'Lab technician profiles fetched successfully.', data });
  } catch (err) { next(err); }
};

export const createLabTechnicianProfile = async (req, res, next) => {
  try {
    const files = req.files || {};
    const certificateImage = files.certificate_image?.[0]?.filename ? `/uploads/lab/${files.certificate_image[0].filename}` : null;
    const panImage = files.pan_image?.[0]?.filename ? `/uploads/lab/${files.pan_image[0].filename}` : null;
    const labProfileImage = files.lab_profile_image?.[0]?.filename ? `/uploads/lab/${files.lab_profile_image[0].filename}` : null;
    const id = await model.createLabTechnicianProfile({
      ...req.body,
      certificate_image: certificateImage,
      pan_image: panImage,
      lab_profile_image: labProfileImage,
    });
    return sendSuccess(res, { statusCode: 201, message: 'Lab technician profile created successfully.', data: { id } });
  } catch (err) { next(err); }
};

export const updateLabTechnicianProfile = async (req, res, next) => {
  try {
    const files = req.files || {};
    const certificateImage = files.certificate_image?.[0]?.filename ? `/uploads/lab/${files.certificate_image[0].filename}` : undefined;
    const panImage = files.pan_image?.[0]?.filename ? `/uploads/lab/${files.pan_image[0].filename}` : undefined;
    const labProfileImage = files.lab_profile_image?.[0]?.filename ? `/uploads/lab/${files.lab_profile_image[0].filename}` : undefined;
    await model.updateLabTechnicianProfile(parseInt(req.params.id, 10), {
      ...req.body,
      certificate_image: certificateImage ?? req.body.certificate_image,
      pan_image: panImage ?? req.body.pan_image,
      lab_profile_image: labProfileImage ?? req.body.lab_profile_image,
    });
    return sendSuccess(res, { message: 'Lab technician profile updated successfully.' });
  } catch (err) { next(err); }
};

export const getMyDepartments = async (req, res, next) => {
  try {
    const data = await model.listTechnicianDepartments(req.user.sub);
    return sendSuccess(res, { message: 'Technician departments fetched successfully.', data });
  } catch (err) { next(err); }
};

export const createMyDepartment = async (req, res, next) => {
  try {
    const key = String(req.body.department_key || '').trim().toLowerCase();
    const name = String(req.body.department_name || '').trim();
    if (!key || !name) return next(new AppError('department_key and department_name are required.', 400));
    const id = await model.createTechnicianDepartment(req.user.sub, key, name);
    return sendSuccess(res, { statusCode: 201, message: 'Department added successfully.', data: { id } });
  } catch (err) { next(err); }
};

export const deleteMyDepartment = async (req, res, next) => {
  try {
    const ok = await model.deleteTechnicianDepartment(parseInt(req.params.id, 10), req.user.sub);
    if (!ok) return next(new AppError('Department not found.', 404));
    return sendSuccess(res, { message: 'Department removed successfully.' });
  } catch (err) { next(err); }
};

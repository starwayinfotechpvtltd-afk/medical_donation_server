import { verifyToken } from '../utils/jwt.js';
import { findPatientByIdForAuth } from '../models/patient.model.js';
import AppError from '../utils/AppError.js';

const requirePatientAuth = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authorization token is missing or malformed.', 401, 'NO_TOKEN'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (decoded.role !== 'patient' || !decoded.patientId) {
      return next(new AppError('Invalid patient token.', 401, 'INVALID_PATIENT_TOKEN'));
    }

    const patient = await findPatientByIdForAuth(decoded.patientId);
    if (!patient) {
      return next(new AppError('Patient not found.', 401, 'PATIENT_NOT_FOUND'));
    }

    if (!patient.dashboard_enabled) {
      return next(new AppError('Dashboard not yet unlocked', 403, 'DASHBOARD_LOCKED'));
    }

    req.patient = patient;
    next();
  } catch (err) {
    next(err);
  }
};

export default requirePatientAuth;

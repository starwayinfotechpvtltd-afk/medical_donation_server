import { hashPassword, comparePassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';
import { sendSuccess } from '../utils/response.js';
import AppError from '../utils/AppError.js';
import * as patientModel from '../models/patient.model.js';
import { fireAndForgetActivity } from '../utils/activityLogger.js';
import {
  issuePatientOtp,
  verifyPatientOtp,
  consumeVerifiedPatientOtp,
  sendPatientOtpEmail,
} from '../utils/patientOtp.js';

export const registerPatient = async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase()?.trim();
    if (!email || !req.body.password || !req.body.first_name || !req.body.last_name) {
      return next(new AppError('first_name, last_name, email and password are required.', 400));
    }

    const existing = await patientModel.findPatientByEmailWithAuth(email);
    if (existing) {
      return next(new AppError('An account with this email already exists.', 409));
    }

    const patientId = await patientModel.createPatient({ ...req.body, email });
    const hashed = await hashPassword(req.body.password);
    await patientModel.createPatientAuth(patientId, hashed);

    fireAndForgetActivity({
      actorType: 'patient',
      actorId: patientId,
      action: 'patient_registered',
      description: 'Patient registration submitted',
      entityType: 'patients',
      entityId: patientId,
      req,
    });

    return sendSuccess(res, { statusCode: 201, message: 'Registration pending approval' });
  } catch (err) {
    next(err);
  }
};

export const loginPatient = async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase()?.trim();
    const password = req.body.password;

    const patient = await patientModel.findPatientByEmailForSetup(email);
    if (!patient) return next(new AppError('Invalid email or password.', 401));

    if (!patient.password || String(patient.password).trim().length === 0) {
      return next(new AppError('First-time setup required. Verify OTP and create password.', 403, 'PATIENT_PASSWORD_SETUP_REQUIRED'));
    }

    const ok = await comparePassword(password, patient.password);
    if (!ok) return next(new AppError('Invalid email or password.', 401));

    if (patient.registration_status !== 'approved') {
      return next(new AppError('Account not yet approved', 403));
    }

    const token = signToken({ patientId: patient.id, role: 'patient' });
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));

    await Promise.all([
      patientModel.savePatientRefreshToken(patient.id, token, expiresAt),
      patientModel.updatePatientLastLogin(patient.id),
    ]);

    fireAndForgetActivity({
      actorType: 'patient',
      actorId: patient.id,
      action: 'patient_login',
      description: 'Patient logged in',
      entityType: 'patients',
      entityId: patient.id,
      req,
    });

    return sendSuccess(res, {
      message: 'Login successful.',
      data: {
        token,
        patient: {
          id: patient.id,
          first_name: patient.first_name,
          last_name: patient.last_name,
          email: patient.email,
          dashboard_enabled: patient.dashboard_enabled,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const requestPatientOtp = async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase()?.trim();
    const patient = await patientModel.findPatientByEmailForSetup(email);

    if (!patient) {
      return next(new AppError('Patient account not found for this email.', 404, 'PATIENT_NOT_FOUND'));
    }

    if (patient.registration_status !== 'approved' || Number(patient.dashboard_enabled) !== 1) {
      return next(new AppError('Patient account is not yet approved.', 403, 'PATIENT_NOT_APPROVED'));
    }

    const otp = issuePatientOtp(email);
    await sendPatientOtpEmail({
      email,
      otp,
      patientName: `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
    });

    return sendSuccess(res, { message: 'OTP sent to patient email successfully.' });
  } catch (err) {
    next(err);
  }
};

export const verifyPatientOtpCode = async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase()?.trim();
    const otp = String(req.body.otp || '').trim();

    const patient = await patientModel.findPatientByEmailForSetup(email);
    if (!patient) {
      return next(new AppError('Patient account not found for this email.', 404, 'PATIENT_NOT_FOUND'));
    }

    const verification = verifyPatientOtp(email, otp);
    if (!verification.ok) {
      return next(new AppError('Invalid or expired OTP.', 400, verification.reason));
    }

    return sendSuccess(res, { message: 'OTP verified successfully.' });
  } catch (err) {
    next(err);
  }
};

export const setPatientPassword = async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase()?.trim();
    const password = req.body.password;

    const patient = await patientModel.findPatientByEmailForSetup(email);
    if (!patient) {
      return next(new AppError('Patient account not found for this email.', 404, 'PATIENT_NOT_FOUND'));
    }

    const otpVerified = consumeVerifiedPatientOtp(email);
    if (!otpVerified) {
      return next(new AppError('OTP verification required before setting password.', 400, 'OTP_NOT_VERIFIED'));
    }

    const passwordHash = await hashPassword(password);
    await patientModel.updatePatientPassword(patient.id, passwordHash);

    return sendSuccess(res, { message: 'Patient password created successfully. You can now login.' });
  } catch (err) {
    next(err);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    const data = await patientModel.getPatientDashboardData(req.patient.id);

    fireAndForgetActivity({
      actorType: 'patient',
      actorId: req.patient.id,
      action: 'dashboard_viewed',
      description: 'Patient opened dashboard',
      entityType: 'patients',
      entityId: req.patient.id,
      req,
    });

    return sendSuccess(res, { message: 'Dashboard fetched successfully.', data });
  } catch (err) {
    next(err);
  }
};

export const getMedicalHistory = async (req, res, next) => {
  try {
    const rows = await patientModel.getPatientMedicalHistory(req.patient.id);
    return sendSuccess(res, { message: 'Medical history fetched successfully.', data: rows });
  } catch (err) {
    next(err);
  }
};

export const getLabReports = async (req, res, next) => {
  try {
    const rows = await patientModel.getPatientLabReports(req.patient.id);
    return sendSuccess(res, { message: 'Lab reports fetched successfully.', data: rows });
  } catch (err) {
    next(err);
  }
};

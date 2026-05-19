import * as userModel from '../models/user.model.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { signToken, buildTokenPayload } from '../utils/jwt.js';
import { sendSuccess } from '../utils/response.js';
import AppError from '../utils/AppError.js';
import { USER_STATUS } from '../config/constants.js';
import { fireAndForgetActivity } from '../utils/activityLogger.js';
import {
  issueDoctorOtp,
  verifyDoctorOtp,
  consumeVerifiedDoctorOtp,
  sendDoctorOtpEmail,
} from '../utils/doctorOtp.js';
import {
  issueLabTechOtp,
  verifyLabTechOtp,
  consumeVerifiedLabTechOtp,
  sendLabTechOtpEmail,
} from '../utils/labTechOtp.js';

export const register = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, role, phone } = req.body;

    const exists = await userModel.emailExists(email.toLowerCase().trim());
    if (exists) {
      return next(new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN'));
    }

    const hashedPassword = await hashPassword(password);

    const { id } = await userModel.createUser({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      role,
      phone,
    });

    const user = await userModel.findById(id);
    const token = signToken(buildTokenPayload(user));

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Account created successfully.',
      data: { token, user },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findByEmail(email.toLowerCase().trim());

    if (!user) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      return next(new AppError('Your account has been suspended.', 403));
    }

    if (user.status === USER_STATUS.INACTIVE) {
      return next(new AppError('Your account is inactive.', 403));
    }

    if (user.role === 'doctor' && (!user.password || user.password.trim().length === 0)) {
      return next(new AppError('First-time setup required. Verify OTP and create password.', 403, 'DOCTOR_PASSWORD_SETUP_REQUIRED'));
    }

    if (user.role === 'lab_technician' && (!user.password || user.password.trim().length === 0)) {
      return next(new AppError('First-time setup required. Verify OTP and create password.', 403, 'LABTECH_PASSWORD_SETUP_REQUIRED'));
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const { password: _password, ...safeUser } = user;

    userModel.updateLastLogin(user.id).catch(() => {});

    const token = signToken(buildTokenPayload(safeUser));

    fireAndForgetActivity({
      actorType: 'user',
      actorId: user.id,
      action: 'staff_login',
      description: 'Staff user logged in',
      entityType: 'users',
      entityId: user.id,
      req,
    });

    return sendSuccess(res, {
      message: 'Login successful.',
      data: { token, user: safeUser },
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.sub);

    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    return sendSuccess(res, {
      message: 'Profile fetched successfully.',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const requestDoctorOtp = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const user = await userModel.findByEmailForSetup(email);

    if (!user || user.role !== 'doctor') {
      return next(new AppError('Doctor account not found for this email.', 404, 'DOCTOR_NOT_FOUND'));
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      return next(new AppError('Doctor account is not active.', 403, 'ACCOUNT_NOT_ACTIVE'));
    }

    const otp = issueDoctorOtp(email);
    await sendDoctorOtpEmail({
      email,
      otp,
      doctorName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    });

    return sendSuccess(res, { message: 'OTP sent to doctor email successfully.' });
  } catch (err) {
    next(err);
  }
};

export const verifyDoctorOtpCode = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const otp = String(req.body.otp).trim();

    const user = await userModel.findByEmailForSetup(email);
    if (!user || user.role !== 'doctor') {
      return next(new AppError('Doctor account not found for this email.', 404, 'DOCTOR_NOT_FOUND'));
    }

    const verification = verifyDoctorOtp(email, otp);
    if (!verification.ok) {
      return next(new AppError('Invalid or expired OTP.', 400, verification.reason));
    }

    return sendSuccess(res, { message: 'OTP verified successfully.' });
  } catch (err) {
    next(err);
  }
};

export const setDoctorPassword = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const password = req.body.password;

    const user = await userModel.findByEmailForSetup(email);
    if (!user || user.role !== 'doctor') {
      return next(new AppError('Doctor account not found for this email.', 404, 'DOCTOR_NOT_FOUND'));
    }

    const otpVerified = consumeVerifiedDoctorOtp(email);
    if (!otpVerified) {
      return next(new AppError('OTP verification required before setting password.', 400, 'OTP_NOT_VERIFIED'));
    }

    const passwordHash = await hashPassword(password);
    await userModel.updatePassword(user.id, passwordHash);

    return sendSuccess(res, { message: 'Doctor password created successfully. You can now login.' });
  } catch (err) {
    next(err);
  }
};

export const requestLabTechOtp = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const user = await userModel.findByEmailForSetup(email);

    if (!user || user.role !== 'lab_technician') {
      return next(new AppError('Lab technician account not found for this email.', 404, 'LABTECH_NOT_FOUND'));
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      return next(new AppError('Lab technician account is not active.', 403, 'ACCOUNT_NOT_ACTIVE'));
    }

    const otp = issueLabTechOtp(email);
    await sendLabTechOtpEmail({
      email,
      otp,
      technicianName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    });

    return sendSuccess(res, { message: 'OTP sent to lab technician email successfully.' });
  } catch (err) {
    next(err);
  }
};

export const verifyLabTechOtpCode = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const otp = String(req.body.otp).trim();

    const user = await userModel.findByEmailForSetup(email);
    if (!user || user.role !== 'lab_technician') {
      return next(new AppError('Lab technician account not found for this email.', 404, 'LABTECH_NOT_FOUND'));
    }

    const verification = verifyLabTechOtp(email, otp);
    if (!verification.ok) {
      return next(new AppError('Invalid or expired OTP.', 400, verification.reason));
    }

    return sendSuccess(res, { message: 'OTP verified successfully.' });
  } catch (err) {
    next(err);
  }
};

export const setLabTechPassword = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const password = req.body.password;

    const user = await userModel.findByEmailForSetup(email);
    if (!user || user.role !== 'lab_technician') {
      return next(new AppError('Lab technician account not found for this email.', 404, 'LABTECH_NOT_FOUND'));
    }

    const otpVerified = consumeVerifiedLabTechOtp(email);
    if (!otpVerified) {
      return next(new AppError('OTP verification required before setting password.', 400, 'OTP_NOT_VERIFIED'));
    }

    const passwordHash = await hashPassword(password);
    await userModel.updatePassword(user.id, passwordHash);

    return sendSuccess(res, { message: 'Lab technician password created successfully. You can now login.' });
  } catch (err) {
    next(err);
  }
};

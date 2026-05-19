import * as model from '../models/admin.model.js';
import { sendSuccess } from '../utils/response.js';
import crypto from 'crypto';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { sendMail, isMailConfigured } from '../utils/mailer.js';
import { patientApprovalTemplate } from '../utils/mailTemplates.js';
import { hashPassword } from '../utils/hash.js';

export const listPatients = async (req, res, next) => {
  try {
    const data = await model.listPatients(req.query.status);
    return sendSuccess(res, { message: 'Patients fetched successfully.', data });
  } catch (err) { next(err); }
};

export const approvePatient = async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    await model.approvePatient(patientId, req.user.sub);

    const patient = await model.getPatientById(patientId);
    const authRecord = await model.getPatientAuthByPatientId(patientId);
    let temporaryPassword = '';

    if (!authRecord) {
      temporaryPassword = crypto.randomBytes(4).toString('hex').toUpperCase();
      const passwordHash = await hashPassword(temporaryPassword);
      await model.createPatientAuthRecord(patientId, passwordHash);
    }

    let emailNotice = 'Patient approved successfully.';

    if (patient?.email) {
      try {
        if (!isMailConfigured()) {
          logger.info('[PATIENT_APPROVAL] SMTP not configured; approval email skipped', {
            patientId,
            email: patient.email,
          });
        } else {
          const loginUrl = (process.env.PATIENT_LOGIN_URL || '').trim() || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/login`;
          const template = patientApprovalTemplate({
            appName: env.app.name,
            patientName: `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
            loginUrl,
            temporaryPassword,
          });

          await sendMail({
            to: patient.email,
            ...template,
          });
        }
      } catch (mailErr) {
        logger.error('[PATIENT_APPROVAL] Failed to send approval email', {
          patientId,
          email: patient.email,
          error: mailErr instanceof Error ? mailErr.message : String(mailErr),
        });
        emailNotice = 'Patient approved successfully. Email notification could not be sent.';
      }
    }

    return sendSuccess(res, { message: emailNotice });
  } catch (err) { next(err); }
};

export const rejectPatient = async (req, res, next) => {
  try {
    await model.rejectPatient(parseInt(req.params.id, 10), req.body.rejection_reason);
    return sendSuccess(res, { message: 'Patient rejected successfully.' });
  } catch (err) { next(err); }
};

export const deactivatePatient = async (req, res, next) => {
  try {
    await model.deactivatePatient(parseInt(req.params.id, 10));
    return sendSuccess(res, { message: 'Patient deactivated successfully.' });
  } catch (err) { next(err); }
};

export const deletePatient = async (req, res, next) => {
  try {
    await model.deletePatient(parseInt(req.params.id, 10));
    return sendSuccess(res, { message: 'Patient deleted successfully.' });
  } catch (err) { next(err); }
};

export const getPatientDetail = async (req, res, next) => {
  try {
    const data = await model.getPatientAdminDetail(parseInt(req.params.id, 10));
    return sendSuccess(res, { message: 'Patient detail fetched successfully.', data });
  } catch (err) { next(err); }
};

export const getActivityLogs = async (req, res, next) => {
  try {
    const data = await model.getActivityLogs(req.query);
    return sendSuccess(res, { message: 'Activity logs fetched successfully.', data });
  } catch (err) { next(err); }
};

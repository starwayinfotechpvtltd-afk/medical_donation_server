import crypto from 'crypto';
import env from '../config/env.js';
import logger from './logger.js';
import { sendMail, isMailConfigured } from './mailer.js';
import { patientOtpTemplate } from './mailTemplates.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_TTL_MINUTES = OTP_TTL_MS / (60 * 1000);
const MAX_ATTEMPTS = 5;
const store = new Map();

const generateOtp = () => String(crypto.randomInt(100000, 1000000));
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

export const issuePatientOtp = (email) => {
  const otp = generateOtp();
  const key = email.toLowerCase().trim();
  store.set(key, {
    otpHash: hashOtp(otp),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    verified: false,
  });
  return otp;
};

export const verifyPatientOtp = (email, otp) => {
  const key = email.toLowerCase().trim();
  const record = store.get(key);
  if (!record) return { ok: false, reason: 'OTP_NOT_FOUND' };

  if (Date.now() > record.expiresAt) {
    store.delete(key);
    return { ok: false, reason: 'OTP_EXPIRED' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    store.delete(key);
    return { ok: false, reason: 'OTP_ATTEMPTS_EXCEEDED' };
  }

  if (record.otpHash !== hashOtp(otp)) {
    record.attempts += 1;
    store.set(key, record);
    return { ok: false, reason: 'OTP_INVALID' };
  }

  record.verified = true;
  store.set(key, record);
  return { ok: true };
};

export const consumeVerifiedPatientOtp = (email) => {
  const key = email.toLowerCase().trim();
  const record = store.get(key);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    store.delete(key);
    return false;
  }
  if (!record.verified) return false;
  store.delete(key);
  return true;
};

export const sendPatientOtpEmail = async ({ email, otp, patientName }) => {
  if (!isMailConfigured()) {
    if (env.IS_PROD) {
      throw new Error('SMTP is required to send patient OTP emails in production.');
    }
    logger.info('[PATIENT_OTP] SMTP not configured; OTP logged for development', { email, otp });
    return;
  }

  const template = patientOtpTemplate({
    appName: env.app.name,
    patientName,
    otp,
    expiryMinutes: OTP_TTL_MINUTES,
  });

  await sendMail({
    to: email,
    ...template,
  });

  logger.info('[PATIENT_OTP] OTP email sent', { email, env: env.NODE_ENV });
};

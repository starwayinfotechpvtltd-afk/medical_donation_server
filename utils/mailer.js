import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from './logger.js';

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const auth = env.mail.user && env.mail.pass
    ? { user: env.mail.user, pass: env.mail.pass }
    : undefined;

  transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    auth,
  });

  return transporter;
};

export const isMailConfigured = () => Boolean(env.mail.host && env.mail.fromEmail);

export const sendMail = async ({ to, subject, text, html }) => {
  if (!isMailConfigured()) {
    throw new Error('SMTP mail is not configured.');
  }

  const from = env.mail.fromName
    ? `"${env.mail.fromName.replace(/"/g, '\\"')}" <${env.mail.fromEmail}>`
    : env.mail.fromEmail;

  const info = await getTransporter().sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  logger.info('[MAIL] Email sent successfully', {
    to,
    subject,
    messageId: info.messageId,
  });

  return info;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const doctorOtpTemplate = ({ appName, doctorName, otp, expiryMinutes }) => {
  const safeAppName = escapeHtml(appName);
  const safeDoctorName = escapeHtml(doctorName || 'Doctor');
  const safeOtp = escapeHtml(otp);
  const safeExpiryMinutes = escapeHtml(expiryMinutes);

  const subject = `${appName} doctor account setup OTP`;
  const text = [
    `Hello ${doctorName || 'Doctor'},`,
    '',
    `Your ${appName} doctor account setup OTP is ${otp}.`,
    `This code expires in ${expiryMinutes} minutes.`,
    '',
    'If you did not request this setup code, you can ignore this email.',
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#0f766e;color:#ffffff;">
                <div style="font-size:20px;font-weight:700;">${safeAppName}</div>
                <div style="font-size:13px;margin-top:4px;">Doctor account setup</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:15px;line-height:1.55;">Hello ${safeDoctorName},</p>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">Use this one-time password to verify your email and create your doctor login password.</p>
                <div style="letter-spacing:8px;font-size:32px;font-weight:700;text-align:center;background:#eef7f6;border:1px solid #b9dfdc;border-radius:8px;padding:18px 12px;margin:22px 0;color:#0f4f49;">${safeOtp}</div>
                <p style="margin:0 0 10px;font-size:14px;line-height:1.55;">This code expires in <strong>${safeExpiryMinutes} minutes</strong>.</p>
                <p style="margin:0;font-size:13px;line-height:1.55;color:#5b677a;">If you did not request this setup code, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
};

export const patientOtpTemplate = ({ appName, patientName, otp, expiryMinutes }) => {
  const safeAppName = escapeHtml(appName);
  const safePatientName = escapeHtml(patientName || 'Patient');
  const safeOtp = escapeHtml(otp);
  const safeExpiryMinutes = escapeHtml(expiryMinutes);

  const subject = `${appName} patient account setup OTP`;
  const text = [
    `Hello ${patientName || 'Patient'},`,
    '',
    `Your ${appName} patient account setup OTP is ${otp}.`,
    `This code expires in ${expiryMinutes} minutes.`,
    '',
    'If you did not request this setup code, you can ignore this email.',
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#0b6f53;color:#ffffff;">
                <div style="font-size:20px;font-weight:700;">${safeAppName}</div>
                <div style="font-size:13px;margin-top:4px;">Patient account setup</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:15px;line-height:1.55;">Hello ${safePatientName},</p>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">Use this one-time password to verify your email and create your patient login password.</p>
                <div style="letter-spacing:8px;font-size:32px;font-weight:700;text-align:center;background:#edf8f3;border:1px solid #b7e1d0;border-radius:8px;padding:18px 12px;margin:22px 0;color:#0b6f53;">${safeOtp}</div>
                <p style="margin:0 0 10px;font-size:14px;line-height:1.55;">This code expires in <strong>${safeExpiryMinutes} minutes</strong>.</p>
                <p style="margin:0;font-size:13px;line-height:1.55;color:#5b677a;">If you did not request this setup code, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
};

export const patientApprovalTemplate = ({ appName, patientName, loginUrl, temporaryPassword }) => {
  const safeAppName = escapeHtml(appName);
  const safePatientName = escapeHtml(patientName || 'Patient');
  const safeLoginUrl = escapeHtml(loginUrl || '');

  const subject = `${appName} patient account approved`;
  const text = [
    `Hello ${patientName || 'Patient'},`,
    '',
    `Your patient account for ${appName} has been approved.`,
    'You can now log in to access your dashboard, appointments, prescriptions, and reports.',
    temporaryPassword ? `Temporary password: ${temporaryPassword}` : '',
    temporaryPassword ? 'Please change your password after your first login.' : '',
    loginUrl ? `Login here: ${loginUrl}` : '',
    '',
    'If you did not request this account, please contact the hospital support team.',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#0b6f53;color:#ffffff;">
                <div style="font-size:20px;font-weight:700;">${safeAppName}</div>
                <div style="font-size:13px;margin-top:4px;">Patient account approval</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:15px;line-height:1.55;">Hello ${safePatientName},</p>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">Your patient account has been approved. You can now log in and access your dashboard.</p>
                ${temporaryPassword ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.55;"><strong>Temporary password:</strong> ${escapeHtml(temporaryPassword)}</p>` : ''}
                ${temporaryPassword ? `<p style="margin:0 0 18px;font-size:13px;line-height:1.55;color:#5b677a;">Please change your password after your first login.</p>` : ''}
                ${safeLoginUrl ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.55;">Login URL: <a href="${safeLoginUrl}" style="color:#0b6f53;">${safeLoginUrl}</a></p>` : ''}
                <p style="margin:0;font-size:13px;line-height:1.55;color:#5b677a;">If you did not request this account, please contact hospital support.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
};

export const labTechnicianOtpTemplate = ({
  appName,
  technicianName,
  otp,
  expiryMinutes,
}) => {
  const safeAppName = escapeHtml(appName);
  const safeName = escapeHtml(technicianName || 'Lab Technician');
  const safeOtp = escapeHtml(otp);
  const safeExpiryMinutes = escapeHtml(expiryMinutes);

  const subject = `${appName} lab technician account setup OTP`;

  const text = [
    `Hello ${technicianName || 'Lab Technician'},`,
    '',
    `Your ${appName} lab technician account setup OTP is ${otp}.`,
    `This code expires in ${expiryMinutes} minutes.`,
    '',
    'If you did not request this setup code, you can ignore this email.',
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#6d28d9;color:#ffffff;">
                <div style="font-size:20px;font-weight:700;">${safeAppName}</div>
                <div style="font-size:13px;margin-top:4px;">
                  Lab technician account setup
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:15px;line-height:1.55;">
                  Hello ${safeName},
                </p>

                <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">
                  Use this one-time password to verify your email and create your lab technician login password.
                </p>

                <div style="letter-spacing:8px;font-size:32px;font-weight:700;text-align:center;background:#f4efff;border:1px solid #ddd2ff;border-radius:8px;padding:18px 12px;margin:22px 0;color:#5b21b6;">
                  ${safeOtp}
                </div>

                <p style="margin:0 0 10px;font-size:14px;line-height:1.55;">
                  This code expires in <strong>${safeExpiryMinutes} minutes</strong>.
                </p>

                <p style="margin:0;font-size:13px;line-height:1.55;color:#5b677a;">
                  If you did not request this setup code, you can ignore this email.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
};

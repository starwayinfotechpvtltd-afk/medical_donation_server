import * as model from '../models/appointment.model.js';
import * as patientModel from '../models/patient.model.js';
import { sendSuccess } from '../utils/response.js';
import AppError from '../utils/AppError.js';
import { fireAndForgetActivity } from '../utils/activityLogger.js';
import { ROLES } from '../config/constants.js';
import { pool } from '../config/db.js';

const normalizeGender = (value) => {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return null;
  if (v === 'male') return 'Male';
  if (v === 'female') return 'Female';
  if (v === 'other' || v === 'non_binary' || v === 'non-binary') return 'Other';
  if (v === 'prefer_not_to_say') return 'prefer_not_to_say';
  return null;
};

export const bookAppointment = async (req, res, next) => {
  try {
    const {
      doctor_profile_id,
      department_id,
      scheduled_date,
      scheduled_time,
      type,
      disease,
      reason,
      first_name,
      last_name,
      email,
      phone,
      dob,
      gender,
      address,
    } = req.body;

    if (!department_id || !scheduled_date || !scheduled_time || !reason) {
      return next(new AppError('department_id, scheduled_date, scheduled_time and reason are required.', 400));
    }

    let patientId = req.patient?.id || null;

    if (!patientId) {
      if (!first_name || !last_name || !email) {
        return next(new AppError('first_name, last_name and email are required for guest booking.', 400));
      }
      if (!dob || !gender || !String(address || '').trim()) {
        return next(new AppError('dob, gender and address are required for guest booking.', 400));
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedGender = normalizeGender(gender);
      const existingPatient = await patientModel.findPatientByEmail(normalizedEmail);

      if (existingPatient) {
        patientId = existingPatient.id;
        await patientModel.updatePatientFromAppointment(patientId, {
          first_name: String(first_name).trim(),
          last_name: String(last_name).trim(),
          phone: phone || null,
          date_of_birth: dob || null,
          gender: normalizedGender,
          address: address || null,
        });
      } else {
        patientId = await patientModel.createPatient({
          first_name: String(first_name).trim(),
          last_name: String(last_name).trim(),
          email: normalizedEmail,
          phone: phone || null,
          date_of_birth: dob || null,
          gender: normalizedGender,
          address: address || null,
        });
      }
    }

    const id = await model.createAppointment({
      patient_id: patientId,
      doctor_profile_id: doctor_profile_id ? Number(doctor_profile_id) : null,
      department_id,
      scheduled_date,
      scheduled_time,
      type,
      disease,
      reason,
    });

    fireAndForgetActivity({ actorType: 'patient', actorId: patientId, action: 'appointment_booked', entityType: 'appointments', entityId: id, req });

    return sendSuccess(res, { statusCode: 201, message: 'Appointment booked successfully.', data: { id, patient_id: patientId } });
  } catch (err) { next(err); }
};

export const listAppointments = async (req, res, next) => {
  try {
    if (req.patient) {
      const rows = await model.listAppointmentsForPatient(req.patient.id);
      return sendSuccess(res, { message: 'Appointments fetched successfully.', data: rows });
    }

    if (req.user?.role === ROLES.DOCTOR) {
      const [doctorRows] = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = ? LIMIT 1', [req.user.sub]);
      if (doctorRows[0]?.id) {
        const rows = await model.listAppointmentsForDoctor(doctorRows[0].id);
        return sendSuccess(res, { message: 'Appointments fetched successfully.', data: rows });
      }
    }

    const rows = await model.listAppointmentsForStaff();
    return sendSuccess(res, { message: 'Appointments fetched successfully.', data: rows });
  } catch (err) { next(err); }
};

const getDoctorProfileIdByUserId = async (userId) => {
  const [rows] = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0]?.id || null;
};

export const approveAppointment = async (req, res, next) => {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    let doctorProfileId = null;
    if (req.user?.role === ROLES.DOCTOR) {
      doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
      if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    }
    const ok = await model.approveAppointment(appointmentId, req.user.sub, doctorProfileId);
    if (!ok) return next(new AppError('Appointment already reviewed or assigned to another doctor.', 409));
    fireAndForgetActivity({ actorType: 'user', actorId: req.user.sub, action: 'appointment_approved', entityType: 'appointments', entityId: parseInt(req.params.id, 10), req });
    return sendSuccess(res, { message: 'Appointment approved successfully.' });
  } catch (err) { next(err); }
};

export const rejectAppointment = async (req, res, next) => {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    let doctorProfileId = null;
    if (req.user?.role === ROLES.DOCTOR) {
      doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
      if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    }
    const ok = await model.rejectAppointment(appointmentId, req.user.sub, req.body.cancellation_reason, doctorProfileId);
    if (!ok) return next(new AppError('Appointment already reviewed or assigned to another doctor.', 409));
    return sendSuccess(res, { message: 'Appointment rejected successfully.' });
  } catch (err) { next(err); }
};

export const cancelAppointment = async (req, res, next) => {
  try {
    await model.cancelAppointmentByPatient(parseInt(req.params.id, 10), req.patient.id, req.body.cancellation_reason);
    fireAndForgetActivity({ actorType: 'patient', actorId: req.patient.id, action: 'appointment_cancelled', entityType: 'appointments', entityId: parseInt(req.params.id, 10), req });
    return sendSuccess(res, { message: 'Appointment cancelled successfully.' });
  } catch (err) { next(err); }
};

export const moveAppointmentNextDate = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    const nextDate = String(req.body.scheduled_date || '').trim();
    const nextTime = String(req.body.scheduled_time || '').trim();
    if (!nextDate || !nextTime) return next(new AppError('scheduled_date and scheduled_time are required.', 400));
    await model.moveAppointmentNextDate(parseInt(req.params.id, 10), doctorProfileId, nextDate, nextTime, req.body.note || null);
    return sendSuccess(res, { message: 'Next appointment date updated successfully.' });
  } catch (err) { next(err); }
};

export const dischargeAppointment = async (req, res, next) => {
  try {
    const doctorProfileId = await getDoctorProfileIdByUserId(req.user.sub);
    if (!doctorProfileId) return next(new AppError('Doctor profile not found.', 404));
    await model.dischargeAppointment(parseInt(req.params.id, 10), doctorProfileId, req.body.note || null);
    return sendSuccess(res, { message: 'Patient discharged successfully.' });
  } catch (err) { next(err); }
};

import * as model from '../models/doctor.model.js';
import { sendSuccess } from '../utils/response.js';

export const listDoctors = async (_req, res, next) => {
  try {
    const data = await model.getDoctors();
    return sendSuccess(res, { message: 'Doctors fetched successfully.', data });
  } catch (err) { next(err); }
};

export const getDoctor = async (req, res, next) => {
  try {
    const data = await model.getDoctorById(parseInt(req.params.id, 10));
    return sendSuccess(res, { message: 'Doctor fetched successfully.', data });
  } catch (err) { next(err); }
};

export const assignDepartment = async (req, res, next) => {
  try {
    await model.assignDoctorDepartment(parseInt(req.params.id, 10), req.body.department_id, req.body.is_primary || 0);
    return sendSuccess(res, { message: 'Doctor department assigned successfully.' });
  } catch (err) { next(err); }
};

export const removeDepartment = async (req, res, next) => {
  try {
    await model.removeDoctorDepartment(parseInt(req.params.id, 10), parseInt(req.params.deptId, 10));
    return sendSuccess(res, { message: 'Doctor department removed successfully.' });
  } catch (err) { next(err); }
};

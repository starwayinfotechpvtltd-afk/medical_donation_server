import * as model from '../models/department.model.js';
import { sendSuccess } from '../utils/response.js';
import AppError from '../utils/AppError.js';

const parseServices = (raw) => {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const value = raw.trim();
    if (!value) return [];
    if (value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // Fallback to comma-separated parsing below
      }
    }
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return undefined;
};

const groupDepartmentRows = (rows) => {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, { ...row, services: [] });
    }
    if (row.service_id) {
      map.get(row.id).services.push({ id: row.service_id, service_name: row.service_name });
    }
  }
  return [...map.values()];
};

export const listDepartments = async (_req, res, next) => {
  try {
    const rows = await model.getDepartments();
    return sendSuccess(res, { message: 'Departments fetched successfully.', data: groupDepartmentRows(rows) });
  } catch (err) { next(err); }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const data = await model.getDepartmentDetail(parseInt(req.params.id, 10));
    if (!data.department) return next(new AppError('Department not found.', 404));
    return sendSuccess(res, { message: 'Department fetched successfully.', data });
  } catch (err) { next(err); }
};

export const createDepartment = async (req, res, next) => {
  try {
    if (!req.body.name) return next(new AppError('name is required.', 400));
    const payload = { ...req.body };
    const services = parseServices(req.body.services);
    if (services !== undefined) payload.services = [...new Set(services)];
    if (req.file?.filename) payload.image_url = `/uploads/departments/${req.file.filename}`;
    const id = await model.createDepartment(payload);
    return sendSuccess(res, { statusCode: 201, message: 'Department created successfully.', data: { id } });
  } catch (err) { next(err); }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    const services = parseServices(req.body.services);
    if (services !== undefined) payload.services = [...new Set(services)];
    if (req.file?.filename) payload.image_url = `/uploads/departments/${req.file.filename}`;
    await model.updateDepartment(parseInt(req.params.id, 10), payload);
    return sendSuccess(res, { message: 'Department updated successfully.' });
  } catch (err) { next(err); }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    await model.softDeleteDepartment(parseInt(req.params.id, 10));
    return sendSuccess(res, { message: 'Department deleted successfully.' });
  } catch (err) { next(err); }
};

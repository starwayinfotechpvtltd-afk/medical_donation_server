import * as userModel from '../models/user.model.js';
import { hashPassword } from '../utils/hash.js';
import { sendSuccess } from '../utils/response.js';
import { sanitizeUser, sanitizeUsers } from '../utils/sanitize.js';
import AppError from '../utils/AppError.js';
import { ROLES } from '../config/constants.js';

export const listUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const { limit, offset, page } = req.pagination;

    if (role && !Object.values(ROLES).includes(role)) {
      return next(new AppError(`Invalid role filter: ${role}`, 400, 'INVALID_FILTER'));
    }

    const { rows, total } = await userModel.findAllUsers({ role, status, search, limit, offset });

    return sendSuccess(res, {
      message: 'Users fetched successfully.',
      data: sanitizeUsers(rows),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);

    if (req.user.role !== ROLES.ADMIN && req.user.sub !== targetId) {
      return next(new AppError('You are not authorized to view this profile.', 403, 'FORBIDDEN'));
    }

    const user = await userModel.findUserWithProfile(targetId);
    if (!user) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    return sendSuccess(res, {
      message: 'User fetched successfully.',
      data: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, role, phone } = req.body;

    const exists = await userModel.emailExists(email.toLowerCase().trim());
    if (exists) {
      return next(new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN'));
    }

    const hashedPassword = await hashPassword(password);

    const { id } = await userModel.createUser({
      first_name, last_name, email, password: hashedPassword, role, phone,
    });

    const user = await userModel.findById(id);

    return sendSuccess(res, {
      statusCode: 201,
      message: 'User created successfully.',
      data: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const isAdmin = req.user.role === ROLES.ADMIN;
    const isSelf = req.user.sub === targetId;

    if (!isAdmin && !isSelf) {
      return next(new AppError('You are not authorized to update this user.', 403, 'FORBIDDEN'));
    }

    const existing = await userModel.findById(targetId);
    if (!existing) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    if (!isAdmin) {
      delete req.body.role;
      delete req.body.status;
    }

    if (req.body.email) {
      const emailTaken = await userModel.emailExists(req.body.email, targetId);
      if (emailTaken) {
        return next(new AppError('This email is already in use by another account.', 409, 'EMAIL_TAKEN'));
      }
    }

    const updated = await userModel.updateUser(targetId, req.body);
    if (!updated) {
      return next(new AppError('No valid fields provided to update.', 400, 'NO_CHANGES'));
    }

    const user = await userModel.findById(targetId);

    return sendSuccess(res, {
      message: 'User updated successfully.',
      data: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);

    if (req.user.sub === targetId) {
      return next(new AppError('You cannot delete your own account.', 400, 'SELF_DELETE'));
    }

    const existing = await userModel.findById(targetId);
    if (!existing) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    await userModel.hardDeleteUser(targetId);
    return sendSuccess(res, { message: 'User deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);

    if (req.user.sub === targetId) {
      return next(new AppError('You cannot deactivate your own account.', 400, 'SELF_DEACTIVATE'));
    }

    const existing = await userModel.findById(targetId);
    if (!existing) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    await userModel.softDeleteUser(targetId);
    return sendSuccess(res, { message: 'User deactivated successfully.' });
  } catch (err) {
    next(err);
  }
};

export const upsertDoctorProfile = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const isAdmin = req.user.role === ROLES.ADMIN;
    const isSelf = req.user.sub === targetId;

    if (!isAdmin && !isSelf) {
      return next(new AppError('You are not authorized to update this profile.', 403, 'FORBIDDEN'));
    }

    const user = await userModel.findById(targetId);
    if (!user) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    if (user.role !== ROLES.DOCTOR) {
      return next(new AppError('Doctor profile can only be set for users with role "doctor".', 400, 'INVALID_ROLE'));
    }

    await userModel.upsertDoctorProfile(targetId, req.body);
    const profile = await userModel.findDoctorProfile(targetId);

    return sendSuccess(res, {
      message: 'Doctor profile updated successfully.',
      data: profile,
    });
  } catch (err) {
    next(err);
  }
};

export const assignRole = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (!role || !Object.values(ROLES).includes(role)) {
      return next(new AppError(`Role must be one of: ${Object.values(ROLES).join(', ')}.`, 400, 'INVALID_ROLE'));
    }

    const user = await userModel.findById(targetId);
    if (!user) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    if (user.role === role) {
      return next(new AppError(`User already has role "${role}".`, 400, 'ROLE_UNCHANGED'));
    }

    await userModel.updateUser(targetId, { role });
    const updated = await userModel.findById(targetId);

    return sendSuccess(res, {
      message: `Role updated to "${role}" successfully.`,
      data: sanitizeUser(updated),
    });
  } catch (err) {
    next(err);
  }
};

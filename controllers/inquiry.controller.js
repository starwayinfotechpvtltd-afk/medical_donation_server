import * as model from '../models/inquiry.model.js';
import { sendSuccess } from '../utils/response.js';
import AppError from '../utils/AppError.js';

export const createInquiry = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return next(new AppError('name, email, subject and message are required.', 400));
    }
    const id = await model.createInquiry(req.body);
    return sendSuccess(res, { statusCode: 201, message: 'Inquiry submitted successfully.', data: { id } });
  } catch (err) { next(err); }
};

export const listInquiries = async (req, res, next) => {
  try {
    const isRead = req.query.is_read === undefined ? undefined : parseInt(req.query.is_read, 10);
    const rows = await model.listInquiries(isRead);
    return sendSuccess(res, { message: 'Inquiries fetched successfully.', data: rows });
  } catch (err) { next(err); }
};

export const markInquiryRead = async (req, res, next) => {
  try {
    await model.markInquiryRead(parseInt(req.params.id, 10), req.user.sub);
    return sendSuccess(res, { message: 'Inquiry marked as read.' });
  } catch (err) { next(err); }
};

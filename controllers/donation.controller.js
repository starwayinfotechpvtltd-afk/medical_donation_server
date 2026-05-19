import * as donModel from '../models/donation.model.js';
import { sendSuccess } from '../utils/response.js';
import AppError from '../utils/AppError.js';
import { v4 as uuid } from 'uuid';
import {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  getRazorpayPublicConfig,
} from '../utils/razorpay.js';

export const donate = async (req, res, next) => {
  try {
    const {
      amount,
      currency = 'INR',
      payment_method = 'other',
      is_anonymous = false,
      donor_message = null,
      donor_name = null,
      donor_email = null,
      donor_phone = null,
      donor_pan = null,
      donor_address = null,
    } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return next(new AppError('Please provide a valid donation amount.', 400, 'INVALID_DONATION_AMOUNT'));
    }

    const amountPaise = Math.round(parsedAmount * 100);
    if (amountPaise < 100) {
      return next(new AppError('Minimum donation is INR 1.', 400, 'INVALID_DONATION_AMOUNT'));
    }

    const transaction_ref = `TXN-${uuid().split('-')[0].toUpperCase()}-${Date.now()}`;

    const order = await createRazorpayOrder({
      amountPaise,
      currency,
      receipt: transaction_ref,
      notes: {
        purpose: 'general_donation',
        donor_email: donor_email || '',
      },
    });

    const { id } = await donModel.createTransaction({
      amount: parsedAmount,
      currency,
      payment_method,
      transaction_ref,
      razorpay_order_id: order.id,
      donor_name:    donor_name    || null,
      donor_email:   donor_email   || null,
      donor_phone:   donor_phone   || null,
      donor_pan:     donor_pan     || null,
      donor_address: donor_address || null,
      is_anonymous:  is_anonymous ? 1 : 0,
      donor_message: donor_message || null,
    });

    const { keyId } = getRazorpayPublicConfig();

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Donation initiated successfully.',
      data: {
        transaction_id:    id,
        transaction_ref,
        razorpay_key_id:   keyId,
        razorpay_order_id: order.id,
        amount:            order.amount,
        currency:          order.currency,
        purpose:           'General Donation',
      },
    });
  } catch (err) { next(err); }
};

export const verifyDonationPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return next(
        new AppError(
          'razorpay_order_id, razorpay_payment_id and razorpay_signature are required.',
          400
        )
      );
    }

    const valid = verifyRazorpayPaymentSignature({
      orderId:   razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!valid) {
      return next(new AppError('Invalid Razorpay payment signature.', 400, 'INVALID_PAYMENT_SIGNATURE'));
    }

    const tx = await donModel.findTransactionByRazorpayOrderId(razorpay_order_id);
    if (!tx) {
      return next(new AppError('Donation transaction not found.', 404, 'DONATION_TX_NOT_FOUND'));
    }

    await donModel.markTransactionCompleted(tx.id, {
      razorpay_payment_id,
      razorpay_signature,
      gateway_response: req.body,
    });

    const transaction = await donModel.findTransactionById(tx.id);
    return sendSuccess(res, {
      message: 'Donation payment verified successfully. Thank you for your contribution!',
      data: transaction,
    });
  } catch (err) { next(err); }
};

export const handleDonationWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody   = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');

    const isValid = verifyRazorpayWebhookSignature({ rawBody, signature });
    if (!isValid) {
      return next(new AppError('Invalid Razorpay webhook signature.', 400, 'INVALID_WEBHOOK_SIGNATURE'));
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const event   = payload?.event;
    const entity  = payload?.payload?.payment?.entity;
    const orderId = entity?.order_id;

    if (event === 'payment.captured' && orderId) {
      const tx = await donModel.findTransactionByRazorpayOrderId(orderId);
      if (tx) {
        await donModel.markTransactionCompleted(tx.id, {
          razorpay_payment_id: entity?.id   || null,
          razorpay_signature:  null,
          gateway_response:    payload,
        });
      }
    }

    if (event === 'payment.failed' && orderId) {
      await donModel.markTransactionFailedByOrder(orderId, payload);
    }

    return res.status(200).json({ ok: true });
  } catch (err) { next(err); }
};

export const getStats = async (_req, res, next) => {
  try {
    const stats = await donModel.getOverallStats();
    return sendSuccess(res, { message: 'Donation stats fetched.', data: stats });
  } catch (err) { next(err); }
};

export const getRecentDonations = async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20', 10)));
    const rows  = await donModel.getRecentCompletedDonations(limit);
    return sendSuccess(res, { message: 'Recent donations fetched.', data: rows });
  } catch (err) { next(err); }
};

export const getTransactions = async (req, res, next) => {
  try {
    const { limit, offset, page } = req.pagination;
    const { donor_email, payment_status, from_date, to_date } = req.query;

    const { rows, total } = await donModel.findTransactions({
      limit,
      offset,
      donor_email:    donor_email    ? String(donor_email).trim()    : undefined,
      payment_status: payment_status ? String(payment_status).trim() : undefined,
      from_date:      from_date      ? String(from_date).trim()      : undefined,
      to_date:        to_date        ? String(to_date).trim()        : undefined,
    });

    return sendSuccess(res, {
      message: 'Transactions fetched successfully.',
      data: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};
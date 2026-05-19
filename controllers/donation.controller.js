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

export const createCampaign = async (req, res, next) => {
  try {
    const {
      title, description,
      goal_amount, currency, start_date,
      end_date, thumbnail_url, is_featured,
    } = req.body;

    const { id } = await donModel.createCampaign({
      title,
      description,
      created_by: null,
      goal_amount: parseFloat(goal_amount),
      currency,
      start_date,
      end_date,
      thumbnail_url,
      is_featured,
    });

    const campaign = await donModel.findCampaignById(id);

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Campaign created successfully.',
      data: campaign,
    });
  } catch (err) { next(err); }
};

export const listCampaigns = async (req, res, next) => {
  try {
    const { status, is_featured } = req.query;
    const { limit, offset, page } = req.pagination;

    const { rows, total } = await donModel.findAllCampaigns({
      status,
      is_featured: is_featured !== undefined ? Boolean(parseInt(is_featured, 10)) : undefined,
      limit, offset,
    });

    return sendSuccess(res, {
      message: 'Campaigns fetched successfully.',
      data: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

export const getCampaign = async (req, res, next) => {
  try {
    const campaign = await donModel.findCampaignById(parseInt(req.params.id, 10));
    if (!campaign) return next(new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND'));

    const stats = await donModel.getCampaignStats(campaign.id);
    const progressPct = campaign.goal_amount > 0
      ? Math.min(100, ((campaign.raised_amount / campaign.goal_amount) * 100).toFixed(2))
      : 0;

    return sendSuccess(res, {
      message: 'Campaign fetched successfully.',
      data: { ...campaign, stats, progress_percent: parseFloat(progressPct) },
    });
  } catch (err) { next(err); }
};

export const updateCampaign = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const campaign = await donModel.findCampaignById(id);
    if (!campaign) return next(new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND'));

    if (['completed', 'cancelled'].includes(campaign.status)) {
      return next(new AppError(`Cannot edit a ${campaign.status} campaign.`, 400, 'CAMPAIGN_LOCKED'));
    }

    await donModel.updateCampaign(id, req.body);
    const updated = await donModel.findCampaignById(id);

    return sendSuccess(res, { message: 'Campaign updated successfully.', data: updated });
  } catch (err) { next(err); }
};

export const deleteCampaign = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const campaign = await donModel.findCampaignById(id);
    if (!campaign) return next(new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND'));

    if (campaign.status !== 'draft') {
      return next(new AppError('Only draft campaigns can be deleted.', 400, 'CAMPAIGN_NOT_DRAFT'));
    }

    await donModel.deleteCampaign(id);
    return sendSuccess(res, { message: 'Campaign deleted successfully.' });
  } catch (err) { next(err); }
};

export const donate = async (req, res, next) => {
  try {
    const campaignId = parseInt(req.params.id, 10);
    const {
      amount, currency = 'INR', payment_method = 'other',
      is_anonymous = false, donor_message = null,
      donor_name, donor_email, donor_phone, donor_pan, donor_address,
    } = req.body;

    const campaign = await donModel.findCampaignById(campaignId);
    if (!campaign) return next(new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND'));

    if (campaign.status !== 'active') {
      return next(new AppError('Donations are only accepted for active campaigns.', 400, 'CAMPAIGN_NOT_ACTIVE'));
    }

    if (campaign.end_date && new Date(campaign.end_date) < new Date()) {
      return next(new AppError('This campaign has expired.', 400, 'CAMPAIGN_EXPIRED'));
    }

    const parsedAmount = parseFloat(amount);
    const transaction_ref = `TXN-${uuid().split('-')[0].toUpperCase()}-${Date.now()}`;
    const amountPaise = Math.round(parsedAmount * 100);
    if (amountPaise < 100) {
      return next(new AppError('Minimum donation is INR 1.', 400, 'INVALID_DONATION_AMOUNT'));
    }

    const order = await createRazorpayOrder({
      amountPaise,
      currency,
      receipt: transaction_ref,
      notes: {
        campaign_id: String(campaignId),
        donor_email: donor_email || '',
      },
    });

    const { id } = await donModel.createTransaction({
      donation_id: campaignId,
      donor_patient_id: null,
      donor_user_id: null,
      amount: parsedAmount,
      currency,
      payment_method,
      transaction_ref,
      razorpay_order_id: order.id,
      donor_name: donor_name || null,
      donor_email: donor_email || null,
      donor_phone: donor_phone || null,
      donor_pan: donor_pan || null,
      donor_address: donor_address || null,
      is_anonymous: is_anonymous ? 1 : 0,
      donor_message,
    });
    const { keyId } = getRazorpayPublicConfig();

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Donation initiated successfully.',
      data: {
        transaction_id: id,
        transaction_ref,
        razorpay_key_id: keyId,
        razorpay_order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        campaign_title: campaign.title,
      },
    });
  } catch (err) { next(err); }
};

export const verifyDonationPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return next(new AppError('razorpay_order_id, razorpay_payment_id and razorpay_signature are required.', 400));
    }

    const valid = verifyRazorpayPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!valid) return next(new AppError('Invalid Razorpay payment signature.', 400, 'INVALID_PAYMENT_SIGNATURE'));

    const tx = await donModel.findTransactionByRazorpayOrderId(razorpay_order_id);
    if (!tx) return next(new AppError('Donation transaction not found.', 404, 'DONATION_TX_NOT_FOUND'));

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
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const isValid = verifyRazorpayWebhookSignature({ rawBody, signature });
    if (!isValid) return next(new AppError('Invalid Razorpay webhook signature.', 400, 'INVALID_WEBHOOK_SIGNATURE'));

    const payload = JSON.parse(rawBody.toString('utf8'));
    const event = payload?.event;
    const entity = payload?.payload?.payment?.entity;
    const orderId = entity?.order_id;

    if (event === 'payment.captured' && orderId) {
      const tx = await donModel.findTransactionByRazorpayOrderId(orderId);
      if (tx) {
        await donModel.markTransactionCompleted(tx.id, {
          razorpay_payment_id: entity?.id || null,
          razorpay_signature: null,
          gateway_response: payload,
        });
      }
    }

    if ((event === 'payment.failed' || event === 'order.paid') && orderId) {
      if (event === 'payment.failed') {
        await donModel.markTransactionFailedByOrder(orderId, payload);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) { next(err); }
};

export const getCampaignTransactions = async (req, res, next) => {
  try {
    const campaignId = parseInt(req.params.id, 10);
    const { limit, offset, page } = req.pagination;

    const campaign = await donModel.findCampaignById(campaignId);
    if (!campaign) return next(new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND'));

    const { rows, total } = await donModel.findTransactionsByCampaign(campaignId, { limit, offset });

    return sendSuccess(res, {
      message: 'Campaign transactions fetched successfully.',
      data: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
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
    const rows = await donModel.getRecentCompletedDonations(limit);
    return sendSuccess(res, { message: 'Recent donations fetched.', data: rows });
  } catch (err) { next(err); }
};

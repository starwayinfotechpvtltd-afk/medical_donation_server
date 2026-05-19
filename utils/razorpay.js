import crypto from 'crypto';
import AppError from './AppError.js';

const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1';

const getCreds = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  return { keyId, keySecret };
};

const getWebhookSecret = () => process.env.RAZORPAY_WEBHOOK_SECRET || '';

const basicAuthHeader = () => {
  const { keyId, keySecret } = getCreds();
  if (!keyId || !keySecret) {
    throw new AppError('Razorpay credentials are not configured.', 500, 'RAZORPAY_NOT_CONFIGURED');
  }
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
};

export const createRazorpayOrder = async ({ amountPaise, currency, receipt, notes = {} }) => {
  const res = await fetch(`${RAZORPAY_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency,
      receipt,
      payment_capture: 1,
      notes,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new AppError(`Razorpay order creation failed: ${txt}`, 502, 'RAZORPAY_ORDER_CREATE_FAILED');
  }

  return res.json();
};

export const verifyRazorpayPaymentSignature = ({ orderId, paymentId, signature }) => {
  const { keySecret } = getCreds();
  if (!keySecret) return false;
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return expected === signature;
};

export const verifyRazorpayWebhookSignature = ({ rawBody, signature }) => {
  const secret = getWebhookSecret();
  if (!secret || !signature) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return digest === signature;
};

export const getRazorpayPublicConfig = () => {
  const { keyId } = getCreds();
  return { keyId };
};

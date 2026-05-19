import { pool } from '../config/db.js';

export const createTransaction = async ({
  amount,
  currency = 'INR',
  payment_method = 'other',
  transaction_ref = null,
  razorpay_order_id = null,
  donor_name = null,
  donor_email = null,
  donor_phone = null,
  donor_pan = null,
  donor_address = null,
  is_anonymous = 0,
  donor_message = null,
}) => {
  const [result] = await pool.query(
    `INSERT INTO transactions
      (amount, currency, payment_method, payment_status,
       transaction_ref, razorpay_order_id,
       donor_name, donor_email, donor_phone, donor_pan, donor_address,
       is_anonymous, donor_message, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      amount,
      currency,
      payment_method,
      transaction_ref,
      razorpay_order_id,
      donor_name   || null,
      donor_email  || null,
      donor_phone  || null,
      donor_pan    || null,
      donor_address|| null,
      is_anonymous ? 1 : 0,
      donor_message|| null,
    ]
  );
  return { id: result.insertId };
};

export const findTransactionById = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM transactions WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

export const findTransactionByRazorpayOrderId = async (razorpayOrderId) => {
  const [rows] = await pool.query(
    `SELECT * FROM transactions WHERE razorpay_order_id = ? LIMIT 1`,
    [razorpayOrderId]
  );
  return rows[0] || null;
};

export const markTransactionCompleted = async (
  transactionId,
  { razorpay_payment_id, razorpay_signature, gateway_response = null }
) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT id, payment_status FROM transactions WHERE id = ? LIMIT 1 FOR UPDATE',
      [transactionId]
    );
    const tx = rows[0];
    if (!tx) throw new Error('TRANSACTION_NOT_FOUND');

    // Idempotent — already completed, nothing to do
    if (tx.payment_status === 'completed') {
      await conn.commit();
      return false;
    }

    await conn.query(
      `UPDATE transactions
       SET payment_status      = 'completed',
           razorpay_payment_id = ?,
           razorpay_signature  = ?,
           gateway_response    = ?,
           updated_at          = NOW()
       WHERE id = ?`,
      [
        razorpay_payment_id || null,
        razorpay_signature  || null,
        gateway_response ? JSON.stringify(gateway_response) : null,
        transactionId,
      ]
    );

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const markTransactionFailedByOrder = async (razorpayOrderId, gateway_response = null) => {
  await pool.query(
    `UPDATE transactions
     SET payment_status   = 'failed',
         gateway_response = COALESCE(?, gateway_response),
         updated_at       = NOW()
     WHERE razorpay_order_id = ?
       AND payment_status    = 'pending'`,
    [gateway_response ? JSON.stringify(gateway_response) : null, razorpayOrderId]
  );
};

export const getOverallStats = async () => {
  const [rows] = await pool.query(
    `SELECT
       (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE payment_status = 'completed')
         AS total_raised,
       (SELECT COUNT(*) FROM transactions WHERE payment_status = 'completed')
         AS total_transactions,
       (SELECT COUNT(*) FROM transactions
        WHERE DATE(created_at) = CURDATE() AND payment_status = 'completed')
         AS today_transactions,
       (SELECT COALESCE(SUM(amount), 0) FROM transactions
        WHERE DATE(created_at) = CURDATE() AND payment_status = 'completed')
         AS today_raised,
       (SELECT COUNT(*) FROM transactions
        WHERE payment_status = 'completed' AND is_anonymous = 0)
         AS named_donations,
       (SELECT COUNT(DISTINCT donor_email) FROM transactions
        WHERE payment_status = 'completed'
          AND donor_email IS NOT NULL AND donor_email <> '')
         AS unique_donors`
  );
  return rows[0];
};

export const getRecentCompletedDonations = async (limit = 20) => {
  const [rows] = await pool.query(
    `SELECT
       id, amount, currency, created_at, is_anonymous,
       donor_name, donor_email, donor_phone, transaction_ref, donor_message
     FROM transactions
     WHERE payment_status = 'completed'
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
};

export const findTransactions = async ({
  limit,
  offset,
  donor_email,
  payment_status,
  from_date,
  to_date,
}) => {
  const conditions = [];
  const params = [];

  if (donor_email) {
    conditions.push('donor_email = ?');
    params.push(donor_email);
  }
  if (payment_status) {
    conditions.push('payment_status = ?');
    params.push(payment_status);
  }
  if (from_date) {
    conditions.push('DATE(created_at) >= ?');
    params.push(from_date);
  }
  if (to_date) {
    conditions.push('DATE(created_at) <= ?');
    params.push(to_date);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM transactions ${where}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       id, amount, currency, payment_method, payment_status,
       transaction_ref, razorpay_order_id, razorpay_payment_id,
       donor_name, donor_email, donor_phone, donor_pan, donor_address,
       is_anonymous, donor_message, receipt_url, created_at, updated_at
     FROM transactions
     ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { rows, total };
};
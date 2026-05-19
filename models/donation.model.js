import { pool } from '../config/db.js';

export const createCampaign = async ({
  title, description = null,
  created_by = null, goal_amount, currency = 'INR',
  start_date = null, end_date = null,
  thumbnail_url = null, is_featured = 0,
}) => {
  const [result] = await pool.query(
    `INSERT INTO donations
       (title, description, patient_id, created_by, goal_amount,
        currency, status, start_date, end_date, thumbnail_url,
        is_featured, raised_amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, 0.00, NOW(), NOW())`,
    [title.trim(), description, null, created_by, goal_amount, currency, start_date, end_date, thumbnail_url, is_featured]
  );
  return { id: result.insertId };
};

export const findCampaignById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM donations WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

export const findAllCampaigns = async ({ status, is_featured, limit, offset }) => {
  const conditions = [];
  const params = [];

  if (status) { conditions.push('d.status = ?'); params.push(status); }
  if (is_featured !== undefined) { conditions.push('d.is_featured = ?'); params.push(is_featured ? 1 : 0); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM donations d ${where}`, params);

  const [rows] = await pool.query(
    `SELECT d.id, d.title, d.status, d.goal_amount, d.raised_amount,
       d.currency, d.start_date, d.end_date, d.is_featured,
       d.thumbnail_url, d.created_at
     FROM donations d
     ${where}
     ORDER BY d.is_featured DESC, d.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { rows, total };
};

export const updateCampaign = async (id, fields) => {
  const ALLOWED = ['title', 'description', 'goal_amount', 'status', 'start_date', 'end_date', 'thumbnail_url', 'is_featured'];
  const updates = [];
  const params = [];

  for (const key of ALLOWED) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }

  if (!updates.length) return false;

  params.push(id);
  await pool.query(`UPDATE donations SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
  return true;
};

export const deleteCampaign = async (id) => {
  const [result] = await pool.query('DELETE FROM donations WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

export const createTransaction = async ({
  donation_id, donor_patient_id = null, donor_user_id = null, amount, currency = 'INR',
  payment_method, transaction_ref = null,
  razorpay_order_id = null, donor_name = null, donor_email = null, donor_phone = null, donor_pan = null, donor_address = null,
  is_anonymous = 0, donor_message = null,
}) => {
  const [result] = await pool.query(
    `INSERT INTO transactions
      (donation_id, donor_patient_id, donor_user_id, amount, currency, payment_method, payment_status,
       transaction_ref, razorpay_order_id, donor_name, donor_email, donor_phone, donor_pan, donor_address,
       is_anonymous, donor_message, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      donation_id,
      donor_patient_id,
      donor_user_id,
      amount,
      currency,
      payment_method,
      transaction_ref,
      razorpay_order_id,
      donor_name,
      donor_email,
      donor_phone,
      donor_pan,
      donor_address,
      is_anonymous ? 1 : 0,
      donor_message,
    ]
  );
  return { id: result.insertId };
};

export const findTransactionById = async (id) => {
  const [rows] = await pool.query(
    `SELECT t.*, d.title AS campaign_title
     FROM transactions t
     JOIN donations d ON d.id = t.donation_id
     WHERE t.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

export const findTransactionByRazorpayOrderId = async (razorpayOrderId) => {
  const [rows] = await pool.query(
    `SELECT t.*, d.title AS campaign_title
     FROM transactions t
     JOIN donations d ON d.id = t.donation_id
     WHERE t.razorpay_order_id = ?
     LIMIT 1`,
    [razorpayOrderId]
  );
  return rows[0] || null;
};

export const markTransactionCompleted = async (transactionId, { razorpay_payment_id, razorpay_signature, gateway_response = null }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT id, donation_id, amount, payment_status FROM transactions WHERE id = ? LIMIT 1 FOR UPDATE', [transactionId]);
    const tx = rows[0];
    if (!tx) throw new Error('TRANSACTION_NOT_FOUND');
    if (tx.payment_status === 'completed') {
      await conn.commit();
      return false;
    }

    await conn.query(
      `UPDATE transactions
       SET payment_status = 'completed',
           razorpay_payment_id = ?,
           razorpay_signature = ?,
           gateway_response = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [razorpay_payment_id || null, razorpay_signature || null, gateway_response ? JSON.stringify(gateway_response) : null, transactionId]
    );

    await conn.query(
      `UPDATE donations
       SET raised_amount = raised_amount + ?,
           updated_at = NOW()
       WHERE id = ?`,
      [tx.amount, tx.donation_id]
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
     SET payment_status = 'failed',
         gateway_response = COALESCE(?, gateway_response),
         updated_at = NOW()
     WHERE razorpay_order_id = ?
       AND payment_status = 'pending'`,
    [gateway_response ? JSON.stringify(gateway_response) : null, razorpayOrderId]
  );
};

export const findTransactionsByCampaign = async (donationId, { limit, offset }) => {
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM transactions WHERE donation_id = ?', [donationId]);

  const [rows] = await pool.query(
    `SELECT
       t.id, t.amount, t.currency, t.payment_method,
       t.payment_status, t.transaction_ref,
       t.is_anonymous, t.donor_message, t.created_at
     FROM transactions t
     WHERE t.donation_id = ?
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    [donationId, limit, offset]
  );

  return { rows, total };
};

export const getCampaignStats = async (donationId) => {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS total_transactions,
       SUM(amount) AS total_raised,
       MAX(amount) AS largest_donation,
       MIN(amount) AS smallest_donation,
       AVG(amount) AS average_donation,
       SUM(is_anonymous = 0) AS named_donors,
       SUM(is_anonymous = 1) AS anonymous_donors
     FROM transactions
     WHERE donation_id = ?
       AND payment_status = 'completed'`,
    [donationId]
  );
  return rows[0];
};

export const getOverallStats = async () => {
  const [rows] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM donations) AS total_campaigns,
       (SELECT COUNT(*) FROM donations WHERE status='active') AS active_campaigns,
       (SELECT COALESCE(SUM(raised_amount),0) FROM donations) AS total_raised,
       (SELECT COUNT(*) FROM transactions WHERE payment_status='completed') AS total_transactions,
       (SELECT COUNT(*) FROM transactions
        WHERE DATE(created_at) = CURDATE()
          AND payment_status='completed') AS today_transactions,
       (SELECT COALESCE(SUM(amount),0) FROM transactions
        WHERE DATE(created_at) = CURDATE()
          AND payment_status='completed') AS today_raised,
       (SELECT COUNT(*) FROM transactions WHERE payment_status='completed' AND is_anonymous = 0) AS named_donations,
       (SELECT COUNT(DISTINCT donor_email) FROM transactions WHERE payment_status='completed' AND donor_email IS NOT NULL AND donor_email <> '') AS unique_donors`
  );
  return rows[0];
};

export const getRecentCompletedDonations = async (limit = 20) => {
  const [rows] = await pool.query(
    `SELECT
      t.id, t.amount, t.currency, t.created_at, t.is_anonymous,
      t.donor_name, t.donor_email, t.donor_phone, t.transaction_ref,
      d.title AS campaign_title
     FROM transactions t
     JOIN donations d ON d.id = t.donation_id
     WHERE t.payment_status = 'completed'
     ORDER BY t.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
};

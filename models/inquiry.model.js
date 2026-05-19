import { pool } from '../config/db.js';

export const createInquiry = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO inquiries (name, email, phone, subject, message, is_read, handled_by, created_at)
     VALUES (?, ?, ?, ?, ?, 0, NULL, NOW())`,
    [data.name, data.email, data.phone || null, data.subject, data.message]
  );
  return result.insertId;
};

export const listInquiries = async (isRead) => {
  const [rows] = isRead === undefined
    ? await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC')
    : await pool.query('SELECT * FROM inquiries WHERE is_read = ? ORDER BY created_at DESC', [isRead]);
  return rows;
};

export const markInquiryRead = async (id, userId) => {
  await pool.query('UPDATE inquiries SET is_read = 1, handled_by = ? WHERE id = ?', [userId, id]);
};

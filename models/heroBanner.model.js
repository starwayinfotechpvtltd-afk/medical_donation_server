import { pool } from '../config/db.js';

export const listActiveHeroBanners = async () => {
  const [rows] = await pool.query(
    `SELECT id, title, image_url, link_url, sort_order
     FROM hero_banners
     WHERE is_active = 1
     ORDER BY sort_order ASC, id DESC`
  );
  return rows;
};

export const listHeroBannersForAdmin = async () => {
  const [rows] = await pool.query(
    `SELECT id, title, image_url, link_url, sort_order, is_active, created_at, updated_at
     FROM hero_banners
     ORDER BY sort_order ASC, id DESC`
  );
  return rows;
};

export const createHeroBanner = async ({ title, image_url, link_url, sort_order, is_active }) => {
  const [result] = await pool.query(
    `INSERT INTO hero_banners
      (title, image_url, link_url, sort_order, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [title || null, image_url, link_url || null, sort_order ?? 0, is_active ? 1 : 0]
  );
  return result.insertId;
};

export const updateHeroBanner = async (id, { title, link_url, sort_order, is_active }) => {
  const [result] = await pool.query(
    `UPDATE hero_banners
     SET title = COALESCE(?, title),
         link_url = ?,
         sort_order = COALESCE(?, sort_order),
         is_active = COALESCE(?, is_active),
         updated_at = NOW()
     WHERE id = ?`,
    [title ?? null, link_url ?? null, sort_order ?? null, is_active === undefined ? null : (is_active ? 1 : 0), id]
  );
  return result.affectedRows > 0;
};

export const deleteHeroBanner = async (id) => {
  const [rows] = await pool.query('SELECT image_url FROM hero_banners WHERE id = ? LIMIT 1', [id]);
  const imageUrl = rows[0]?.image_url || null;
  const [result] = await pool.query('DELETE FROM hero_banners WHERE id = ?', [id]);
  return { deleted: result.affectedRows > 0, imageUrl };
};

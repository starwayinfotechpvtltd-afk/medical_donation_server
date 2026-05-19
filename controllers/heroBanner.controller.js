import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as model from '../models/heroBanner.model.js';
import { sendSuccess } from '../utils/response.js';
import AppError from '../utils/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

export const listPublicHeroBanners = async (_req, res, next) => {
  try {
    const rows = await model.listActiveHeroBanners();
    return sendSuccess(res, { message: 'Hero banners fetched successfully.', data: rows });
  } catch (err) { next(err); }
};

export const listAdminHeroBanners = async (_req, res, next) => {
  try {
    const rows = await model.listHeroBannersForAdmin();
    return sendSuccess(res, { message: 'Hero banners fetched successfully.', data: rows });
  } catch (err) { next(err); }
};

export const createHeroBanner = async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('Banner image is required.', 400));
    const imageUrl = `/uploads/banners/${req.file.filename}`;
    const id = await model.createHeroBanner({
      title: req.body.title || null,
      image_url: imageUrl,
      link_url: req.body.link_url || null,
      sort_order: req.body.sort_order ? Number(req.body.sort_order) : 0,
      is_active: req.body.is_active === undefined ? true : String(req.body.is_active) !== '0',
    });
    return sendSuccess(res, { statusCode: 201, message: 'Hero banner created successfully.', data: { id, image_url: imageUrl } });
  } catch (err) { next(err); }
};

export const updateHeroBanner = async (req, res, next) => {
  try {
    const ok = await model.updateHeroBanner(parseInt(req.params.id, 10), {
      title: req.body.title,
      link_url: req.body.link_url,
      sort_order: req.body.sort_order !== undefined ? Number(req.body.sort_order) : undefined,
      is_active: req.body.is_active !== undefined ? String(req.body.is_active) === '1' || req.body.is_active === true : undefined,
    });
    if (!ok) return next(new AppError('Hero banner not found.', 404));
    return sendSuccess(res, { message: 'Hero banner updated successfully.' });
  } catch (err) { next(err); }
};

export const deleteHeroBanner = async (req, res, next) => {
  try {
    const { deleted, imageUrl } = await model.deleteHeroBanner(parseInt(req.params.id, 10));
    if (!deleted) return next(new AppError('Hero banner not found.', 404));
    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(serverRoot, imageUrl.replace(/^\//, ''));
      fs.promises.unlink(filePath).catch(() => {});
    }
    return sendSuccess(res, { message: 'Hero banner deleted successfully.' });
  } catch (err) { next(err); }
};

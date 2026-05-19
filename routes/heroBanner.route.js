import { Router } from 'express';
import * as ctrl from '../controllers/heroBanner.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import { ROLES } from '../config/constants.js';
import { handleUpload, uploadBanner } from '../middleware/upload.js';

const router = Router();

router.get('/', ctrl.listPublicHeroBanners);
router.get('/admin', authenticate, authorize(ROLES.ADMIN), ctrl.listAdminHeroBanners);
router.post('/admin', authenticate, authorize(ROLES.ADMIN), handleUpload(uploadBanner.single('banner')), ctrl.createHeroBanner);
router.patch('/admin/:id', authenticate, authorize(ROLES.ADMIN), ctrl.updateHeroBanner);
router.delete('/admin/:id', authenticate, authorize(ROLES.ADMIN), ctrl.deleteHeroBanner);

export default router;

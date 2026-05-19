import { Router } from 'express';
import * as ctrl from '../controllers/inquiry.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.post('/', ctrl.createInquiry);
router.get('/', authenticate, authorize(ROLES.ADMIN), ctrl.listInquiries);
router.patch('/:id/read', authenticate, authorize(ROLES.ADMIN), ctrl.markInquiryRead);

export default router;

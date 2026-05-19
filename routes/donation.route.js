import { Router } from 'express';
import * as ctrl from '../controllers/donation.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import paginate from '../middleware/paginate.js';
import { validate } from '../validation/donation.validation.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.post('/donate', validate('donate'), ctrl.donate);
router.post('/verify-payment', ctrl.verifyDonationPayment);
router.post('/webhook', ctrl.handleDonationWebhook);

router.get('/stats', authenticate, authorize(ROLES.ADMIN), ctrl.getStats);
router.get('/recent', authenticate, authorize(ROLES.ADMIN), ctrl.getRecentDonations);
router.get('/transactions', authenticate, authorize(ROLES.ADMIN), paginate, ctrl.getTransactions);

export default router;

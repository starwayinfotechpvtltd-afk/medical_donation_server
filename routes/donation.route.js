import { Router } from 'express';
import * as ctrl from '../controllers/donation.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import paginate from '../middleware/paginate.js';
import { validate } from '../validation/donation.validation.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.get('/stats', authenticate, authorize(ROLES.ADMIN), ctrl.getStats);
router.get('/recent', authenticate, authorize(ROLES.ADMIN), ctrl.getRecentDonations);

router.post('/', authenticate, authorize(ROLES.ADMIN), validate('campaign'), ctrl.createCampaign);
router.get('/', paginate, ctrl.listCampaigns);
router.get('/:id', ctrl.getCampaign);
router.patch('/:id', authenticate, authorize(ROLES.ADMIN), validate('campaign'), ctrl.updateCampaign);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), ctrl.deleteCampaign);

router.post('/:id/donate', validate('donate'), ctrl.donate);
router.post('/verify-payment', ctrl.verifyDonationPayment);
router.post('/webhook', ctrl.handleDonationWebhook);
router.get('/:id/transactions', authenticate, authorize(ROLES.ADMIN), paginate, ctrl.getCampaignTransactions);

export default router;

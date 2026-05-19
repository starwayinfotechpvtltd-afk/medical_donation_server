import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.get('/patients', authenticate, authorize(ROLES.ADMIN), ctrl.listPatients);
router.get('/patients/:id', authenticate, authorize(ROLES.ADMIN), ctrl.getPatientDetail);
router.patch('/patients/:id/approve', authenticate, authorize(ROLES.ADMIN, ROLES.DOCTOR), ctrl.approvePatient);
router.patch('/patients/:id/reject', authenticate, authorize(ROLES.ADMIN), ctrl.rejectPatient);
router.patch('/patients/:id/deactivate', authenticate, authorize(ROLES.ADMIN), ctrl.deactivatePatient);
router.delete('/patients/:id', authenticate, authorize(ROLES.ADMIN), ctrl.deletePatient);
router.get('/activity-logs', authenticate, authorize(ROLES.ADMIN), ctrl.getActivityLogs);

export default router;

import { Router } from 'express';
import * as ctrl from '../controllers/doctor.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.get('/', ctrl.listDoctors);
router.get('/:id', ctrl.getDoctor);
router.post('/:id/departments', authenticate, authorize(ROLES.ADMIN), ctrl.assignDepartment);
router.delete('/:id/departments/:deptId', authenticate, authorize(ROLES.ADMIN), ctrl.removeDepartment);

export default router;

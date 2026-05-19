import { Router } from 'express';
import * as ctrl from '../controllers/lab.controller.js';
import authenticate from '../middleware/authenticate.js';
import requirePatientAuth from '../middleware/patientAuth.js';
import authorize from '../middleware/authorize.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.post('/lab-tests', authenticate, authorize(ROLES.DOCTOR, ROLES.ADMIN), ctrl.createLabTest);
router.patch('/lab-tests/:id/assign', authenticate, authorize(ROLES.ADMIN), ctrl.assignLabTech);
router.patch('/lab-tests/:id/results', authenticate, authorize(ROLES.LAB_TECHNICIAN), ctrl.uploadLabResults);
router.get('/lab-tests/:id', authenticate, ctrl.getLabTest);
router.get('/patients/:patientId/lab-tests', (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return authenticate(req, res, next);
  return requirePatientAuth(req, res, (err) => {
    if (err) return authenticate(req, res, next);
    return next();
  });
}, ctrl.getPatientLabTests);

export default router;

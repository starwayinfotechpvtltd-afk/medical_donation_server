import { Router } from 'express';
import * as ctrl from '../controllers/appointment.controller.js';
import authenticate from '../middleware/authenticate.js';
import requirePatientAuth from '../middleware/patientAuth.js';
import authorize from '../middleware/authorize.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.post('/', (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return next();
  return requirePatientAuth(req, res, () => next());
}, ctrl.bookAppointment);
router.get('/', (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return authenticate(req, res, next);
  return requirePatientAuth(req, res, (err) => {
    if (err) return authenticate(req, res, next);
    return next();
  });
}, ctrl.listAppointments);
router.patch('/:id/approve', authenticate, authorize(ROLES.ADMIN, ROLES.DOCTOR), ctrl.approveAppointment);
router.patch('/:id/reject', authenticate, authorize(ROLES.ADMIN, ROLES.DOCTOR), ctrl.rejectAppointment);
router.patch('/:id/next-date', authenticate, authorize(ROLES.DOCTOR), ctrl.moveAppointmentNextDate);
router.patch('/:id/discharge', authenticate, authorize(ROLES.DOCTOR), ctrl.dischargeAppointment);
router.patch('/:id/cancel', requirePatientAuth, ctrl.cancelAppointment);

export default router;

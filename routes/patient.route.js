import { Router } from 'express';
import * as ctrl from '../controllers/patient.controller.js';
import requirePatientAuth from '../middleware/patientAuth.js';

const router = Router();

router.post('/register', ctrl.registerPatient);
router.post('/login', ctrl.loginPatient);
router.post('/request-otp', ctrl.requestPatientOtp);
router.post('/verify-otp', ctrl.verifyPatientOtpCode);
router.post('/set-password', ctrl.setPatientPassword);
router.get('/dashboard', requirePatientAuth, ctrl.getDashboard);
router.get('/medical-history', requirePatientAuth, ctrl.getMedicalHistory);
router.get('/lab-reports', requirePatientAuth, ctrl.getLabReports);

export default router;

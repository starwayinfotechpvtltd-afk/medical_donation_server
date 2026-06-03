import { Router }         from 'express';
import * as authController from '../controllers/auth.controller.js';
import authenticate       from '../middleware/authenticate.js';
import validate           from '../middleware/validate.js';
import { authLimiter }    from '../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  doctorRequestOtpSchema,
  doctorVerifyOtpSchema,
  doctorSetPasswordSchema,
  labTechRequestOtpSchema,
  labTechVerifyOtpSchema,
  labTechSetPasswordSchema,
  changePasswordSchema,
} from '../validation/schemas/auth.schema.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login',    authLimiter, validate(loginSchema),    authController.login);
router.post('/doctor/request-otp', authLimiter, validate(doctorRequestOtpSchema), authController.requestDoctorOtp);
router.post('/doctor/verify-otp', authLimiter, validate(doctorVerifyOtpSchema), authController.verifyDoctorOtpCode);
router.post('/doctor/set-password', authLimiter, validate(doctorSetPasswordSchema), authController.setDoctorPassword);
router.post('/labtech/request-otp', authLimiter, validate(labTechRequestOtpSchema), authController.requestLabTechOtp);
router.post('/labtech/verify-otp', authLimiter, validate(labTechVerifyOtpSchema), authController.verifyLabTechOtpCode);
router.post('/labtech/set-password', authLimiter, validate(labTechSetPasswordSchema), authController.setLabTechPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.get('/me',        authenticate,                          authController.getMe);

export default router;



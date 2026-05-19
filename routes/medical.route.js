import { Router } from 'express';
import * as ctrl from '../controllers/medical.controller.js';
import authenticate from '../middleware/authenticate.js';
import requirePatientAuth from '../middleware/patientAuth.js';
import authorize from '../middleware/authorize.js';
import { ROLES } from '../config/constants.js';
import { handleUpload, uploadMedical } from '../middleware/upload.js';

const router = Router();

router.post('/prescriptions', authenticate, authorize(ROLES.DOCTOR), ctrl.createPrescription);
router.patch('/prescriptions/:id', authenticate, authorize(ROLES.DOCTOR), ctrl.updatePrescription);
router.delete('/prescriptions/:id', authenticate, authorize(ROLES.DOCTOR), ctrl.deletePrescription);
router.get('/doctor/prescriptions', authenticate, authorize(ROLES.DOCTOR), ctrl.listDoctorPrescriptions);
router.post('/prescriptions/from-template', authenticate, authorize(ROLES.DOCTOR), ctrl.createPrescriptionFromTemplate);
router.get('/prescriptions/:id', authenticate, ctrl.getPrescription);
router.get('/patients/:patientId/prescriptions', (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return authenticate(req, res, next);
  return requirePatientAuth(req, res, (err) => {
    if (err) return authenticate(req, res, next);
    return next();
  });
}, ctrl.getPatientPrescriptions);
router.delete('/prescriptions/:id/medicines/:medicineId', authenticate, authorize(ROLES.DOCTOR), ctrl.deleteMedicine);

router.get('/doctor/medications', authenticate, authorize(ROLES.DOCTOR), ctrl.listDoctorMedications);
router.post('/doctor/medications', authenticate, authorize(ROLES.DOCTOR), ctrl.createDoctorMedication);
router.patch('/doctor/medications/:id', authenticate, authorize(ROLES.DOCTOR), ctrl.updateDoctorMedication);
router.delete('/doctor/medications/:id', authenticate, authorize(ROLES.DOCTOR), ctrl.deleteDoctorMedication);

router.get('/doctor/templates', authenticate, authorize(ROLES.DOCTOR), ctrl.listDoctorTemplates);
router.post('/doctor/templates/assets/upload', authenticate, authorize(ROLES.DOCTOR), handleUpload(uploadMedical.single('asset')), ctrl.uploadTemplateAsset);
router.post('/doctor/templates', authenticate, authorize(ROLES.DOCTOR), ctrl.createDoctorTemplate);
router.patch('/doctor/templates/:id', authenticate, authorize(ROLES.DOCTOR), ctrl.updateDoctorTemplate);
router.delete('/doctor/templates/:id', authenticate, authorize(ROLES.DOCTOR), ctrl.deleteDoctorTemplate);

export default router;

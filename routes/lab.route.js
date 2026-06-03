import { Router } from 'express';
import * as ctrl from '../controllers/lab.controller.js';
import authenticate from '../middleware/authenticate.js';
import requirePatientAuth from '../middleware/patientAuth.js';
import authorize from '../middleware/authorize.js';
import { ROLES } from '../config/constants.js';
import { handleUpload, uploadLab } from '../middleware/upload.js';

const router = Router();

router.post('/lab-tests', authenticate, authorize(ROLES.DOCTOR, ROLES.ADMIN), ctrl.createLabTest);
router.get('/my-departments', authenticate, authorize(ROLES.LAB_TECHNICIAN), ctrl.getMyDepartments);
router.post('/my-departments', authenticate, authorize(ROLES.LAB_TECHNICIAN), ctrl.createMyDepartment);
router.delete('/my-departments/:id', authenticate, authorize(ROLES.LAB_TECHNICIAN), ctrl.deleteMyDepartment);
router.get('/lab-tests', authenticate, authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN), ctrl.listLabTests);
router.get('/lab-technicians', authenticate, authorize(ROLES.ADMIN, ROLES.DOCTOR), ctrl.listLabTechnicians);
router.get('/lab-technician-profiles', authenticate, authorize(ROLES.ADMIN), ctrl.listLabTechnicianProfiles);
router.post(
  '/lab-technician-profiles',
  authenticate,
  authorize(ROLES.ADMIN),
  handleUpload(uploadLab.fields([{ name: 'certificate_image', maxCount: 1 }, { name: 'pan_image', maxCount: 1 }, { name: 'lab_profile_image', maxCount: 1 }])),
  ctrl.createLabTechnicianProfile
);
router.patch(
  '/lab-technician-profiles/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  handleUpload(uploadLab.fields([{ name: 'certificate_image', maxCount: 1 }, { name: 'pan_image', maxCount: 1 }, { name: 'lab_profile_image', maxCount: 1 }])),
  ctrl.updateLabTechnicianProfile
);
router.patch('/lab-tests/:id/assign', authenticate, authorize(ROLES.ADMIN, ROLES.DOCTOR), ctrl.assignLabTech);
router.patch('/lab-tests/:id/critical', authenticate, authorize(ROLES.ADMIN), ctrl.toggleCritical);
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

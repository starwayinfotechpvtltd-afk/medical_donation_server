import { Router } from 'express';
import * as ctrl from '../controllers/department.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import { ROLES } from '../config/constants.js';
import { handleUpload, uploadDepartment } from '../middleware/upload.js';

const router = Router();

router.get('/', ctrl.listDepartments);
router.get('/:id', ctrl.getDepartmentById);
router.post('/', authenticate, authorize(ROLES.ADMIN), handleUpload(uploadDepartment.single('image')), ctrl.createDepartment);
router.patch('/:id', authenticate, authorize(ROLES.ADMIN), handleUpload(uploadDepartment.single('image')), ctrl.updateDepartment);
router.put('/:id', authenticate, authorize(ROLES.ADMIN), handleUpload(uploadDepartment.single('image')), ctrl.updateDepartment);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), ctrl.deleteDepartment);

export default router;

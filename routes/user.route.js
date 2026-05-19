import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import paginate from '../middleware/paginate.js';
import { validate } from '../validation/user.validation.js';
import { ROLES } from '../config/constants.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN), paginate, userController.listUsers);
router.get('/:id', userController.getUser);
router.post('/', authorize(ROLES.ADMIN), validate('updateUser'), userController.createUser);
router.patch('/:id', validate('updateUser'), userController.updateUser);
router.patch('/:id/assign-role', authorize(ROLES.ADMIN), userController.assignRole);
router.patch('/:id/doctor-profile', validate('doctorProfile'), userController.upsertDoctorProfile);
router.patch('/:id/deactivate', authorize(ROLES.ADMIN), userController.deactivateUser);
router.delete('/:id', authorize(ROLES.ADMIN), userController.deleteUser);

export default router;

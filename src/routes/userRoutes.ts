import { Router } from 'express';
import { body, param } from 'express-validator';
import { createUser, getAllUsers, getUserSessions } from '../controllers/userController';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

router.post(
  '/',
  [
    body('fullName').trim().notEmpty().withMessage('fullName is required'),
    body('email').trim().isEmail().withMessage('A valid email address is required'),
    body('phone').trim().notEmpty().withMessage('phone is required'),
    validateRequest,
  ],
  createUser
);

router.get('/', getAllUsers);

router.get(
  '/:id/sessions',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    validateRequest,
  ],
  getUserSessions
);

export default router;

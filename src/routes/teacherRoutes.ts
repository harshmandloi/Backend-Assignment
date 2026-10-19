import { Router } from 'express';
import { body } from 'express-validator';
import { createTeacher, getAllTeachers } from '../controllers/teacherController';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

router.post(
  '/',
  [
    body('fullName').trim().notEmpty().withMessage('fullName is required'),
    body('email').trim().isEmail().withMessage('A valid email address is required'),
    body('specialization').trim().notEmpty().withMessage('specialization is required'),
    body('experience').isFloat({ min: 0 }).withMessage('experience must be a non-negative number'),
    validateRequest,
  ],
  createTeacher
);

router.get('/', getAllTeachers);

export default router;

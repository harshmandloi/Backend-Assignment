import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createSession,
  getAvailableSessions,
  bookSession,
  markSessionComplete,
  getAllSessions,
} from '../controllers/sessionController';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

router.get(
  '/available',
  [
    query('dateTimestamp').notEmpty().withMessage('dateTimestamp query parameter is required'),
    validateRequest,
  ],
  getAvailableSessions
);

router.post(
  '/',
  [
    body('teacherId').isMongoId().withMessage('Valid teacherId is required'),
    body('startTime').isISO8601().withMessage('Valid startTime ISO string is required'),
    body('endTime').isISO8601().withMessage('Valid endTime ISO string is required'),
    validateRequest,
  ],
  createSession
);

router.post(
  '/:id/book',
  [
    param('id').isMongoId().withMessage('Invalid session ID'),
    body('userId').isMongoId().withMessage('Valid userId is required'),
    validateRequest,
  ],
  bookSession
);

router.patch(
  '/:id/complete',
  [
    param('id').isMongoId().withMessage('Invalid session ID'),
    validateRequest,
  ],
  markSessionComplete
);

router.get('/', getAllSessions);

export default router;

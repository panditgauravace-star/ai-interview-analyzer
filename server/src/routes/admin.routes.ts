import { Router } from 'express';
import { getAllUsers, getAllInterviews, getAllResults, getAnalytics } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/users', getAllUsers);
router.get('/interviews', getAllInterviews);
router.get('/results', getAllResults);
router.get('/analytics', getAnalytics);

export default router;

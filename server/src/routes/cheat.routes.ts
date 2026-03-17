import { Router } from 'express';
import { logCheat, getCheatLogs } from '../controllers/cheat.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/log', authenticate, logCheat);
router.get('/logs', authenticate, authorize('admin'), getCheatLogs);

export default router;

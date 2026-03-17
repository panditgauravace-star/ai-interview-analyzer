import { Router } from 'express';
import {
    createInterview, getInterview, getUserInterviews,
    submitIntroduction, generateAptitude, submitAptitude,
    generateCoding, runCode, submitTechnical, getResult,
} from '../controllers/interview.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', createInterview);
router.get('/my', getUserInterviews);
router.get('/:id', getInterview);
router.post('/:id/intro', submitIntroduction);
router.post('/:id/aptitude/generate', generateAptitude);
router.post('/:id/aptitude/submit', submitAptitude);
router.post('/:id/coding/generate', generateCoding);
router.post('/:id/code/run', runCode);
router.post('/:id/technical/submit', submitTechnical);
router.get('/:id/result', getResult);

export default router;

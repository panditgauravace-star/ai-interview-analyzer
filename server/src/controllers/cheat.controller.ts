import { Response } from 'express';
import { CheatLog } from '../models/CheatLog.js';
import { AuthRequest } from '../types/index.js';
import { sendResponse, sendError } from '../utils/response.js';

export const logCheat = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { interviewId, type, details } = req.body;
        const userId = req.user!.userId;

        await CheatLog.create({ interviewId, userId, type, details });
        sendResponse(res, 201, 'Cheat incident logged');
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to log cheat', msg);
    }
};

export const getCheatLogs = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { interviewId } = req.query;
        const filter = interviewId ? { interviewId } : {};
        const logs = await CheatLog.find(filter)
            .populate('userId', 'name email')
            .populate('interviewId', 'stream status')
            .sort({ timestamp: -1 });
        sendResponse(res, 200, 'Cheat logs', logs);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to get cheat logs', msg);
    }
};

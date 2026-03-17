import { Response } from 'express';
import { User } from '../models/User.js';
import { Interview } from '../models/Interview.js';
import { Result } from '../models/Result.js';
import { CheatLog } from '../models/CheatLog.js';
import { AuthRequest } from '../types/index.js';
import { sendResponse, sendError } from '../utils/response.js';

export const getAllUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        sendResponse(res, 200, 'All users', users);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to get users', msg);
    }
};

export const getAllInterviews = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const interviews = await Interview.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        sendResponse(res, 200, 'All interviews', interviews);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to get interviews', msg);
    }
};

export const getAllResults = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const results = await Result.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        sendResponse(res, 200, 'All results', results);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to get results', msg);
    }
};

export const getAnalytics = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const [totalUsers, totalInterviews, totalResults, totalCheats] = await Promise.all([
            User.countDocuments(),
            Interview.countDocuments(),
            Result.countDocuments(),
            CheatLog.countDocuments(),
        ]);

        const completedInterviews = await Interview.countDocuments({ status: 'completed' });

        const recentResults = await Result.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('userId', 'name');

        const avgScore = await Result.aggregate([
            { $group: { _id: null, avgScore: { $avg: '$totalScore' } } },
        ]);

        const recommendationStats = await Result.aggregate([
            { $group: { _id: '$recommendation', count: { $sum: 1 } } },
        ]);

        const streamStats = await Interview.aggregate([
            { $group: { _id: '$stream', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        sendResponse(res, 200, 'Analytics', {
            totalUsers,
            totalInterviews,
            completedInterviews,
            totalResults,
            totalCheats,
            averageScore: avgScore[0]?.avgScore || 0,
            recommendationStats,
            streamStats,
            recentResults,
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to get analytics', msg);
    }
};

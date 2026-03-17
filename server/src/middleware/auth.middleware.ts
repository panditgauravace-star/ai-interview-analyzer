import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AuthRequest, JwtPayload } from '../types/index.js';
import { sendError } from '../utils/response.js';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            sendError(res, 401, 'Access denied. No token provided.');
            return;
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            sendError(res, 401, 'Token expired. Please refresh your token.');
            return;
        }
        sendError(res, 401, 'Invalid token.');
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            sendError(res, 403, 'Access denied. Insufficient permissions.');
            return;
        }
        next();
    };
};

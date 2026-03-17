import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response.js';

export const validate = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.errors.map((e) => e.message).join(', ');
                sendError(res, 400, 'Validation error', messages);
                return;
            }
            sendError(res, 400, 'Invalid request data');
        }
    };
};

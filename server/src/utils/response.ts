import { Response } from 'express';
import { ApiResponse } from '../types/index.js';

export const sendResponse = <T>(
    res: Response,
    statusCode: number,
    message: string,
    data?: T
): void => {
    const response: ApiResponse<T> = {
        success: statusCode >= 200 && statusCode < 300,
        message,
        data,
    };
    res.status(statusCode).json(response);
};

export const sendError = (
    res: Response,
    statusCode: number,
    message: string,
    error?: string
): void => {
    const response: ApiResponse = {
        success: false,
        message,
        error,
    };
    res.status(statusCode).json(response);
};

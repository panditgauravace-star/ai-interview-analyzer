import { Router } from 'express';
import { z } from 'zod';
import {
    signup, login, refreshToken, getMe, sendOtp, verifyOtp, forgotPassword, resetPassword,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const signupSchema = z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    password: z.string().min(6),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const otpSchema = z.object({
    email: z.string().email(),
});

const verifyOtpSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
});

const refreshSchema = z.object({
    refreshToken: z.string(),
});

// OTP flow
router.post('/send-otp', validate(otpSchema), sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);

// Auth
router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refreshToken);
router.post('/forgot-password', validate(z.object({ email: z.string().email() })), forgotPassword);
router.post('/reset-password/:token', validate(z.object({ password: z.string().min(6) })), resetPassword);
router.get('/me', authenticate, getMe);

export default router;

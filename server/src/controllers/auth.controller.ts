import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Otp } from '../models/Otp.js';
import { config } from '../config/index.js';
import { sendResponse, sendError } from '../utils/response.js';
import { AuthRequest, JwtPayload } from '../types/index.js';
import * as emailService from '../services/email.service.js';

const generateTokens = (userId: string, role: string) => {
    const accessToken = jwt.sign(
        { userId, role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as SignOptions
    );

    const refreshToken = jwt.sign(
        { userId, role },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn } as SignOptions
    );

    return { accessToken, refreshToken };
};

// Step 1: Send OTP to email
export const sendOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            sendError(res, 400, 'Email is required');
            return;
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            sendError(res, 409, 'An account with this email already exists');
            return;
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Delete old OTPs for this email
        await Otp.deleteMany({ email });

        // Save new OTP (expires in 10 minutes)
        await Otp.create({
            email,
            otp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });

        // Send OTP email
        await emailService.sendOtpEmail(email, otp);

        sendResponse(res, 200, 'OTP sent to your email');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to send OTP', message);
    }
};

// Step 2: Verify OTP
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            sendError(res, 400, 'Email and OTP are required');
            return;
        }

        const otpRecord = await Otp.findOne({ email, otp, verified: false });

        if (!otpRecord) {
            sendError(res, 400, 'Invalid OTP');
            return;
        }

        if (otpRecord.expiresAt < new Date()) {
            await Otp.deleteOne({ _id: otpRecord._id });
            sendError(res, 400, 'OTP has expired. Please request a new one.');
            return;
        }

        // Mark as verified
        otpRecord.verified = true;
        await otpRecord.save();

        sendResponse(res, 200, 'Email verified successfully');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'OTP verification failed', message);
    }
};

// Step 3: Signup (only after OTP verified)
export const signup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password } = req.body;

        // Check OTP was verified
        const verifiedOtp = await Otp.findOne({ email, verified: true });
        if (!verifiedOtp) {
            sendError(res, 400, 'Please verify your email first');
            return;
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            sendError(res, 409, 'User already exists with this email');
            return;
        }

        // Always create as candidate — admin is assigned manually
        const user = await User.create({ name, email, password, role: 'candidate' });
        const tokens = generateTokens(user._id.toString(), user.role);

        // Cleanup OTP records
        await Otp.deleteMany({ email });

        // Send welcome email (fire and forget)
        emailService.sendWelcomeEmail(email, name).catch(() => { });

        sendResponse(res, 201, 'Account created successfully', {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
            },
            ...tokens,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to create account', message);
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            sendError(res, 401, 'Invalid email or password');
            return;
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            sendError(res, 401, 'Invalid email or password');
            return;
        }

        const tokens = generateTokens(user._id.toString(), user.role);

        sendResponse(res, 200, 'Login successful', {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
            },
            ...tokens,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Login failed', message);
    }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            sendError(res, 400, 'Refresh token is required');
            return;
        }

        const decoded = jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
        const user = await User.findById(decoded.userId);

        if (!user) {
            sendError(res, 404, 'User not found');
            return;
        }

        const tokens = generateTokens(user._id.toString(), user.role);
        sendResponse(res, 200, 'Token refreshed', tokens);
    } catch (error) {
        sendError(res, 401, 'Invalid refresh token');
    }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 401, 'Not authenticated');
            return;
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            sendError(res, 404, 'User not found');
            return;
        }

        sendResponse(res, 200, 'User profile', {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            createdAt: user.createdAt,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to get user profile', message);
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            sendError(res, 404, 'User not found');
            return;
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set token and expiration (10 minutes)
        user.resetPasswordToken = resetPasswordToken;
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);

        await user.save();

        // Create reset URL
        // Assuming client runs on port 5173 or process.env.CLIENT_URL
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

        try {
            await emailService.sendPasswordResetEmail(user.email, resetUrl);
            sendResponse(res, 200, 'Password reset email sent');
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            sendError(res, 500, 'Email could not be sent');
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to process request', message);
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(token as string)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            sendError(res, 400, 'Invalid or expired token');
            return;
        }

        // Update password and clear reset fields
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        sendResponse(res, 200, 'Password reset successful');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to reset password', message);
    }
};

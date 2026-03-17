import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

const transporter = nodemailer.createTransport({
  host: config.brevo.smtpHost,
  port: config.brevo.smtpPort,
  secure: false,
  auth: {
    user: config.brevo.smtpUser,
    pass: config.brevo.smtpKey,
  },
});

export const sendWelcomeEmail = async (to: string, name: string): Promise<void> => {
  try {
    await transporter.sendMail({
      from: '"AI Interview Analyzer" <panditgauravace@gmail.com>',
      to,
      subject: 'Welcome to AI Interview Analyzer 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #6366f1;">Welcome, ${name}! 🎉</h1>
          <p>Your account has been created successfully on AI Interview Analyzer.</p>
          <p>You can now start practicing interviews with AI-powered evaluation across multiple domains.</p>
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
            <h3>What you can do:</h3>
            <ul>
              <li>🎯 Choose from 12+ interview streams</li>
              <li>🤖 AI-generated questions tailored to your role</li>
              <li>💻 Practice coding in a real editor</li>
              <li>📊 Get detailed performance analysis</li>
            </ul>
          </div>
          <p>Good luck with your interview preparation!</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

export const sendResultEmail = async (
  to: string,
  name: string,
  score: number,
  recommendation: string
): Promise<void> => {
  try {
    await transporter.sendMail({
      from: '"AI Interview Analyzer" <panditgauravace@gmail.com>',
      to,
      subject: `Your Interview Results - Score: ${score}/100`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #6366f1;">Interview Results 📊</h1>
          <p>Hi ${name},</p>
          <p>Your interview has been evaluated. Here's a summary:</p>
          <div style="background: #1e1b4b; padding: 20px; border-radius: 12px; color: white; text-align: center; margin: 20px 0;">
            <h2 style="font-size: 48px; margin: 0;">${score}<span style="font-size: 24px;">/100</span></h2>
            <p style="font-size: 18px; margin-top: 10px;">Recommendation: <strong>${recommendation.replace('-', ' ').toUpperCase()}</strong></p>
          </div>
          <p>Log in to view your detailed analysis with strengths, weaknesses, and AI recommendations.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

export const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
  try {
    await transporter.sendMail({
      from: '"AI Interview Analyzer" <panditgauravace@gmail.com>',
      to,
      subject: `Your Verification Code: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #6366f1;">Email Verification 🔐</h1>
          <p>Use the following code to verify your email address:</p>
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px; color: white; text-align: center; margin: 20px 0;">
            <h2 style="font-size: 42px; margin: 0; letter-spacing: 8px; font-family: monospace;">${otp}</h2>
          </div>
          <p style="color: #666;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('OTP email sending failed:', error);
    throw new Error('Failed to send OTP email');
  }
};

export const sendPasswordResetEmail = async (to: string, resetUrl: string): Promise<void> => {
  try {
    await transporter.sendMail({
      from: '"AI Interview Analyzer" <panditgauravace@gmail.com>',
      to,
      subject: 'Password Reset Request 🔒',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #6366f1;">Password Reset Request</h1>
          <p>We received a request to reset your password. Click the link below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">This link expires in 10 minutes.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Password reset email sending failed:', error);
    throw new Error('Failed to send password reset email');
  }
};

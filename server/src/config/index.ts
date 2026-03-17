import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGO_URI || '',
    jwt: {
        secret: process.env.JWT_SECRET || '',
        refreshSecret: process.env.JWT_REFRESH_SECRET || '',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    gemini: {
        apiKey: process.env.GEMINI_API_KEY || '',
    },
    brevo: {
        smtpUser: process.env.BREVO_SMTP_USER || '',
        smtpKey: process.env.BREVO_SMTP_KEY || '',
        smtpHost: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
        smtpPort: parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
    },
    piston: {
        apiUrl: process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston',
    },
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
} as const;

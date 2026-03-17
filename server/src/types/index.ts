import { Request } from 'express';

export interface JwtPayload {
    userId: string;
    role: 'candidate' | 'admin';
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export type InterviewStream =
    | 'software-developer'
    | 'frontend-developer'
    | 'backend-developer'
    | 'fullstack-developer'
    | 'data-scientist'
    | 'devops-engineer'
    | 'hr-manager'
    | 'chartered-accountant'
    | 'business-analyst'
    | 'cybersecurity-analyst'
    | 'product-manager'
    | 'uiux-designer';

export type InterviewStatus = 'pending' | 'in-progress' | 'completed' | 'abandoned';

export type RoundType = 'introduction' | 'aptitude' | 'technical';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionType = 'mcq' | 'coding' | 'case-study' | 'behavioral';

export type HiringRecommendation = 'strong-hire' | 'hire' | 'neutral' | 'reject';

export type CheatType = 'tab_switch' | 'no_face' | 'multi_face' | 'copy_paste' | 'fullscreen_exit' | 'suspicious_audio';

export interface TestCase {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
}

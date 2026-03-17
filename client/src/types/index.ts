export interface User {
    id: string;
    name: string;
    email: string;
    role: 'candidate' | 'admin';
    avatar?: string;
    createdAt?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface InterviewStream {
    id: string;
    name: string;
    icon: string;
    description: string;
    difficulty: string;
    duration: string;
    color: string;
}

export interface Interview {
    _id: string;
    userId: string;
    stream: string;
    status: 'pending' | 'in-progress' | 'completed' | 'abandoned';
    currentRound: number;
    rounds: Round[];
    totalScore: number;
    startTime: string;
    endTime?: string;
}

export interface Round {
    type: 'introduction' | 'aptitude' | 'technical';
    status: 'pending' | 'in-progress' | 'completed' | 'skipped';
    score: number;
    maxScore: number;
    startTime?: string;
    endTime?: string;
    data: Record<string, unknown>;
}

export interface MCQQuestion {
    id: string;
    question: string;
    options: string[];
    difficulty: string;
}

export interface CodingProblem {
    title: string;
    description: string;
    constraints: string[];
    examples: { input: string; output: string; explanation: string }[];
    testCases: { input: string; expectedOutput: string; isHidden: boolean }[];
    starterCode: Record<string, string>;
    difficulty: string;
}

export interface CaseStudy {
    title: string;
    scenario: string;
    questions: string[];
    evaluationCriteria: string[];
    difficulty: string;
}

export interface TestResult {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    isHidden: boolean;
}

export interface InterviewResult {
    _id: string;
    interviewId: string;
    userId: string;
    stream: string;
    totalScore: number;
    breakdown: {
        introduction: { score: number; maxScore: number; percentage: number };
        aptitude: { score: number; maxScore: number; percentage: number };
        technical: { score: number; maxScore: number; percentage: number };
    };
    strengths: string[];
    weaknesses: string[];
    ratings: {
        communication: number;
        technical: number;
        problemSolving: number;
        confidence: number;
        overall: number;
    };
    recommendation: 'strong-hire' | 'hire' | 'neutral' | 'reject';
    aiReport: string;
    createdAt: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export interface CheatLog {
    _id: string;
    interviewId: string;
    userId: { name: string; email: string };
    type: string;
    details: string;
    timestamp: string;
}

export interface Analytics {
    totalUsers: number;
    totalInterviews: number;
    completedInterviews: number;
    totalResults: number;
    totalCheats: number;
    averageScore: number;
    recommendationStats: { _id: string; count: number }[];
    streamStats: { _id: string; count: number }[];
    recentResults: InterviewResult[];
}

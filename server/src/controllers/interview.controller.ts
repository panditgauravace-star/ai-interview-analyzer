import { Response } from 'express';
import { Interview } from '../models/Interview.js';
import { Question } from '../models/Question.js';
import { Result } from '../models/Result.js';
import { AuthRequest } from '../types/index.js';
import { sendResponse, sendError } from '../utils/response.js';
import * as aiService from '../services/ai.service.js';
import * as pistonService from '../services/piston.service.js';
import * as emailService from '../services/email.service.js';
import * as interviewService from '../services/interview.service.js';
import { User } from '../models/User.js';

const TECHNICAL_ROLES = [
    'software-developer', 'frontend-developer', 'backend-developer', 'fullstack-developer',
    'data-scientist', 'devops-engineer', 'cybersecurity-analyst'
];

const isTechnical = (stream: string) => TECHNICAL_ROLES.includes(stream);

// ── Create a new interview ──
export const createInterview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { stream } = req.body;
        const userId = req.user!.userId;
        const technical = isTechnical(stream);

        const rounds = [
            { type: 'introduction', status: 'in-progress', score: 0, maxScore: 100, data: {}, startTime: new Date() },
            { type: 'aptitude', status: 'pending', score: 0, maxScore: 100, data: {} },
            {
                type: 'technical',
                status: technical ? 'pending' : 'skipped',
                score: 0,
                maxScore: technical ? 100 : 0,
                data: {},
            },
        ];

        const interview = await Interview.create({
            userId, stream,
            status: 'in-progress',
            currentRound: 0,
            rounds,
            startTime: new Date(),
        });

        sendResponse(res, 201, 'Interview created', { interviewId: interview._id, isTechnicalRole: technical });

        // ── Background Generation ──
        // Trigger question generation for future rounds immediately
        console.log(`[CreateInterview] Triggering background question generation for ${interview._id}`);
        interviewService.prepareAptitudeRound(interview._id.toString())
            .catch(err => console.error(`[Background] Aptitude generation failed for ${interview._id}:`, err));

        if (technical) {
            interviewService.prepareTechnicalRound(interview._id.toString())
                .catch(err => console.error(`[Background] Technical generation failed for ${interview._id}:`, err));
        }

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to create interview', msg);
    }
};

// ── Get interview status ──
export const getInterview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const interview = await Interview.findById(req.params.id);
        if (!interview) { sendError(res, 404, 'Interview not found'); return; }
        sendResponse(res, 200, 'Interview details', interview);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to get interview', msg);
    }
};

// ── Get user interviews ──
export const getUserInterviews = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const interviews = await Interview.find({ userId }).sort({ createdAt: -1 });
        sendResponse(res, 200, 'User interviews', interviews);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to get interviews', msg);
    }
};

// ══════════════════════════════════════════════════════════
//  ROUND 1: INTRODUCTION
// ══════════════════════════════════════════════════════════
export const submitIntroduction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { transcript } = req.body;
        if (!transcript || !transcript.trim()) {
            sendError(res, 400, 'Transcript is required');
            return;
        }
        const interview = await Interview.findById(req.params.id);
        if (!interview) { sendError(res, 404, 'Interview not found'); return; }

        console.log(`[submitIntro] Analyzing intro for ${req.params.id}`);
        const analysis = await aiService.analyzeIntroduction(transcript, interview.stream);

        // Score = overallScore (0-10) * 10 → 0-100 scale
        const rawScore = (analysis as any).overallScore ?? 0;
        const score = Math.min(100, Math.max(0, Math.round(rawScore * 10)));

        interview.rounds[0].status = 'completed';
        interview.rounds[0].data = { transcript, analysis };
        interview.rounds[0].score = score;
        interview.rounds[0].endTime = new Date();
        interview.currentRound = 1;
        interview.rounds[1].status = 'in-progress';
        interview.rounds[1].startTime = new Date();
        interview.markModified('rounds');
        await interview.save();

        console.log(`[submitIntro] Score: ${score}/100, moving to aptitude`);
        sendResponse(res, 200, 'Introduction submitted', { analysis, score });
    } catch (error: unknown) {
        console.error('[submitIntro] Error:', error);
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to submit introduction', msg);
    }
};

// ══════════════════════════════════════════════════════════
//  ROUND 2: APTITUDE — Uses Interview Service
// ══════════════════════════════════════════════════════════
export const generateAptitude = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const questions = await interviewService.prepareAptitudeRound(req.params.id as string);

        const clientQuestions = questions.map((q: any) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            difficulty: q.difficulty,
        }));

        sendResponse(res, 200, 'Aptitude questions loaded', { questions: clientQuestions });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to generate questions', msg);
    }
};

// ── Submit aptitude answers ──
export const submitAptitude = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { answers } = req.body; // { questionId: selectedAnswer }
        const interview = await Interview.findById(req.params.id);
        if (!interview) { sendError(res, 404, 'Interview not found'); return; }

        const questionIds = Object.keys(answers);
        const questions = await Question.find({ _id: { $in: questionIds } });

        let correct = 0;
        const results = questions.map((q) => {
            const userAnswer = answers[q._id.toString()];
            const isCorrect = userAnswer === q.correctAnswer;
            if (isCorrect) correct++;
            return {
                questionId: q._id,
                userAnswer,
                correctAnswer: q.correctAnswer,
                isCorrect,
                explanation: q.explanation,
            };
        });

        const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
        const technical = isTechnical(interview.stream);

        interview.rounds[1].status = 'completed';
        interview.rounds[1].score = score;
        interview.rounds[1].endTime = new Date();
        interview.rounds[1].data = { answers: results, correct, total: questions.length };

        if (technical) {
            interview.currentRound = 2;
            interview.rounds[2].status = 'in-progress';
            interview.rounds[2].startTime = new Date();
        } else {
            // Non-technical: aptitude is the last real round → complete interview
            interview.currentRound = 2;
            interview.rounds[2].status = 'skipped';
            interview.status = 'completed';
            interview.endTime = new Date();

            // Weighted score for non-technical: intro 30% + aptitude 70%
            const introScore = interview.rounds[0].score;
            interview.totalScore = Math.round(introScore * 0.3 + score * 0.7);
        }

        interview.markModified('rounds');
        await interview.save();

        // If non-technical, generate final report immediately
        if (!technical) {
            try {
                const report = await aiService.generateFinalReport(
                    interview.stream,
                    interview.rounds[0].data as Record<string, unknown>,
                    interview.rounds[1].data as Record<string, unknown>,
                    {},
                    interview.rounds[0].score,
                    score,
                    0,
                    false
                );

                const user = await User.findById(req.user!.userId);
                const result = await Result.create({
                    interviewId: interview._id,
                    userId: req.user!.userId,
                    stream: interview.stream,
                    ...(report as object),
                });

                if (user) {
                    await emailService.sendResultEmail(
                        user.email, user.name, result.totalScore, result.recommendation
                    );
                }

                sendResponse(res, 200, 'Aptitude submitted', {
                    score, correct, total: questions.length, results,
                    completed: true, result,
                });
                return;
            } catch (reportError) {
                console.error('[submitAptitude] Report generation failed:', reportError);
            }
        }

        sendResponse(res, 200, 'Aptitude submitted', { score, correct, total: questions.length, results });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to submit aptitude', msg);
    }
};

// ══════════════════════════════════════════════════════════
//  ROUND 3: TECHNICAL — Uses Interview Service
// ══════════════════════════════════════════════════════════
export const generateCoding = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await interviewService.prepareTechnicalRound(req.params.id as string);
        sendResponse(res, 200, 'Technical questions loaded', result);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to generate technical questions', msg);
    }
};

// ── Run code against test cases ──
export const runCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { code, language, testCases } = req.body;
        const results = await pistonService.runTestCases(code, language, testCases);
        sendResponse(res, 200, 'Code executed', results);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Code execution failed', msg);
    }
};

// ══════════════════════════════════════════════════════════
//  SUBMIT TECHNICAL — handles coding AND case-study
// ══════════════════════════════════════════════════════════
export const submitTechnical = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { submissions, roundType } = req.body;
        // roundType: 'coding' | 'case-study'
        // coding submissions: [{ code, language, problemDescription, testResults: { passed, total } }]
        // case-study submissions: [{ answer, caseDescription }]
        const interview = await Interview.findById(req.params.id);
        if (!interview) { sendError(res, 404, 'Interview not found'); return; }

        const evaluations = [];
        let totalScore = 0;

        const type = roundType || 'coding';

        if (type === 'coding') {
            for (const sub of submissions) {
                const testResults = sub.testResults || { passed: 0, total: 0 };

                // Empty code → zero score
                const code = (sub.code || '').trim();
                if (!code || code.length < 10) {
                    evaluations.push({
                        scores: { overall: 0 },
                        feedback: 'No code submitted.',
                    });
                    continue;
                }

                const evaluation = await aiService.evaluateCode(
                    sub.code, sub.language, sub.problemDescription, testResults
                );
                evaluations.push(evaluation);
                totalScore += (evaluation as any).scores?.overall || 0;
            }
        } else {
            // Case study
            for (const sub of submissions) {
                const evaluation = await aiService.evaluateCaseStudy(
                    sub.answer || '', sub.caseDescription || '', interview.stream
                );
                evaluations.push(evaluation);
                totalScore += (evaluation as any).scores?.overall || 0;
            }
        }

        // Average score across problems → 0-100 scale
        const avgRaw = submissions.length > 0 ? totalScore / submissions.length : 0;
        const techScore = Math.min(100, Math.max(0, Math.round(avgRaw * 10)));

        interview.rounds[2].status = 'completed';
        interview.rounds[2].score = techScore;
        interview.rounds[2].endTime = new Date();
        interview.rounds[2].data = { submissions, evaluations, roundType: type };
        interview.status = 'completed';
        interview.endTime = new Date();

        // Final weighted score: intro 20% + aptitude 30% + technical 50%
        const introScore = interview.rounds[0].score;
        const aptScore = interview.rounds[1].score;
        interview.totalScore = Math.round(introScore * 0.2 + aptScore * 0.3 + techScore * 0.5);

        interview.markModified('rounds');
        await interview.save();

        // Generate final AI report with ACTUAL scores
        const report = await aiService.generateFinalReport(
            interview.stream,
            interview.rounds[0].data as Record<string, unknown>,
            interview.rounds[1].data as Record<string, unknown>,
            interview.rounds[2].data as Record<string, unknown>,
            introScore,
            aptScore,
            techScore,
            true
        );

        // Save result
        const user = await User.findById(req.user!.userId);
        const result = await Result.create({
            interviewId: interview._id,
            userId: req.user!.userId,
            stream: interview.stream,
            ...(report as object),
        });

        // Send result email
        if (user) {
            await emailService.sendResultEmail(
                user.email, user.name, result.totalScore, result.recommendation
            );
        }

        sendResponse(res, 200, 'Technical round submitted', { result });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to submit technical round', msg);
    }
};

// ── Get interview result ──
export const getResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await Result.findOne({ interviewId: req.params.id }).populate('userId', 'name email');
        if (!result) { sendError(res, 404, 'Result not found'); return; }
        sendResponse(res, 200, 'Interview result', result);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, 'Failed to get result', msg);
    }
};


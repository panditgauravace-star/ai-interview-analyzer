import { Interview } from '../models/Interview.js';
import { Question } from '../models/Question.js';
import * as aiService from './ai.service.js';

// Helper to determine if a stream is technical
const TECHNICAL_ROLES = [
    'software-developer', 'frontend-developer', 'backend-developer', 'fullstack-developer',
    'data-scientist', 'devops-engineer', 'cybersecurity-analyst'
];
const isTechnical = (stream: string) => TECHNICAL_ROLES.includes(stream);

const CODING_ROLES = [
    'software-developer', 'frontend-developer', 'backend-developer', 'fullstack-developer'
];

/**
 * Prepares the Aptitude Round (Round 2) by ensuring questions are generated and assigned.
 * Safe to call multiple times - will return existing questions if already assigned.
 */
export const prepareAptitudeRound = async (interviewId: string): Promise<any[]> => {
    const interview = await Interview.findById(interviewId);
    if (!interview) throw new Error('Interview not found');

    // Check if questions are already assigned
    const existingData = interview.rounds[1].data as any;
    if (existingData?.questionIds && existingData.questionIds.length > 0) {
        console.log(`[InterviewService] Aptitude questions already assigned for ${interviewId}`);
        const questions = await Question.find({ _id: { $in: existingData.questionIds } });
        return questions.map(q => ({
            id: q._id,
            question: q.content,
            options: q.options,
            difficulty: q.difficulty,
        }));
    }

    console.log(`[InterviewService] Generating aptitude questions for ${interviewId} (${interview.stream})`);
    const userId = interview.userId;
    const QUESTIONS_PER_INTERVIEW = 20;

    // 1. Find question IDs this user has already seen
    const pastInterviews = await Interview.find({
        userId,
        _id: { $ne: interview._id },
        'rounds.1.status': 'completed',
    }).select('rounds');

    const seenQuestionIds = new Set<string>();
    for (const past of pastInterviews) {
        const aptData = past.rounds?.[1]?.data as any;
        if (aptData?.questionIds) {
            for (const qid of aptData.questionIds) {
                seenQuestionIds.add(qid.toString());
            }
        }
    }

    // 2. DB-first: Get all seeded MCQs
    const allDbQuestions = await Question.find({
        role: interview.stream,
        type: 'mcq',
        aiGenerated: false,
    });

    let unseenQuestions = allDbQuestions.filter(q => !seenQuestionIds.has(q._id.toString()));

    if (unseenQuestions.length >= QUESTIONS_PER_INTERVIEW) {
        // Shuffle and pick
        unseenQuestions = unseenQuestions.sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_INTERVIEW);

        const questionIds = unseenQuestions.map(q => q._id.toString());
        interview.rounds[1].data = { ...existingData, questionIds };
        interview.markModified('rounds');
        await interview.save();

        return unseenQuestions.map(q => ({
            id: q._id,
            question: q.content,
            options: q.options,
            difficulty: q.difficulty,
        }));
    }

    // 3. AI Generation
    try {
        console.log(`[InterviewService] AI generating info for ${interview.stream}`);
        const questions = await aiService.generateAptitudeQuestions(interview.stream, QUESTIONS_PER_INTERVIEW);

        const questionDocs = (questions as any[]).map((q: any) => ({
            interviewId: interview._id,
            role: interview.stream,
            type: 'mcq' as const,
            stream: interview.stream,
            difficulty: q.difficulty || 'medium',
            content: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            aiGenerated: true,
        }));

        const savedQuestions = await Question.insertMany(questionDocs);
        const questionIds = savedQuestions.map(q => q._id.toString());

        interview.rounds[1].data = { ...existingData, questionIds };
        interview.markModified('rounds');
        await interview.save();

        return savedQuestions.map(q => ({
            id: q._id,
            question: q.content,
            options: q.options,
            difficulty: q.difficulty,
        }));
    } catch (aiError) {
        console.warn(`[InterviewService] AI generation failed, falling back to DB:`, aiError);
    }

    // 4. Fallback to random DB questions
    if (allDbQuestions.length > 0) {
        const fallback = allDbQuestions.sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_INTERVIEW);
        const questionIds = fallback.map(q => q._id.toString());

        interview.rounds[1].data = { ...existingData, questionIds };
        interview.markModified('rounds');
        await interview.save();

        return fallback.map(q => ({
            id: q._id,
            question: q.content,
            options: q.options,
            difficulty: q.difficulty,
        }));
    }

    throw new Error('No aptitude questions available');
};

/**
 * Prepares the Technical Round (Round 3) - Coding or Case Study.
 */
export const prepareTechnicalRound = async (interviewId: string): Promise<any> => {
    const interview = await Interview.findById(interviewId);
    if (!interview) throw new Error('Interview not found');

    const existingData = interview.rounds[2].data as any;
    if (existingData?.questionIds && existingData.questionIds.length > 0) {
        console.log(`[InterviewService] Technical questions already assigned for ${interviewId}`);
        const questions = await Question.find({ _id: { $in: existingData.questionIds } });

        const type = CODING_ROLES.includes(interview.stream) ? 'coding' : 'case-study';

        if (type === 'coding') {
            const problems = questions.map(q => {
                const parsed = JSON.parse(q.content);
                return {
                    ...parsed,
                    testCases: (q.testCases || []).filter((tc: any) => !tc.isHidden),
                    starterCode: q.starterCode || parsed.starterCode,
                    difficulty: q.difficulty,
                };
            });
            return { problems, type };
        } else {
            const problems = questions.map(q => JSON.parse(q.content));
            return { problems, type };
        }
    }

    console.log(`[InterviewService] Generating technical questions for ${interviewId} (${interview.stream})`);
    const userId = interview.userId;
    const technical = isTechnical(interview.stream);

    // Find seen IDs
    const pastInterviews = await Interview.find({
        userId,
        _id: { $ne: interview._id },
        'rounds.2.status': 'completed',
    }).select('rounds');

    const seenQuestionIds = new Set<string>();
    for (const past of pastInterviews) {
        const techData = past.rounds?.[2]?.data as any;
        if (techData?.questionIds) {
            for (const qid of techData.questionIds) {
                seenQuestionIds.add(qid.toString());
            }
        }
    }

    if (technical && CODING_ROLES.includes(interview.stream)) {
        // ── CODING PATH ──
        const allDbProblems = await Question.find({
            role: interview.stream,
            type: 'coding',
            aiGenerated: false,
        });

        const unseenProblems = allDbProblems.filter(q => !seenQuestionIds.has(q._id.toString()));

        // Try to pick 1 easy, 1 medium, 1 hard
        const getPool = (diff: string) => unseenProblems.filter(q => q.difficulty === diff).sort(() => Math.random() - 0.5);
        const easyPool = getPool('easy');
        const mediumPool = getPool('medium');
        const hardPool = getPool('hard');

        if (easyPool.length >= 1 && mediumPool.length >= 1 && hardPool.length >= 1) {
            const selected = [easyPool[0], mediumPool[0], hardPool[0]];
            const questionIds = selected.map(q => q._id.toString());

            interview.rounds[2].data = { ...existingData, questionIds };
            interview.markModified('rounds');
            await interview.save();

            const problems = selected.map(q => {
                const parsed = JSON.parse(q.content);
                return {
                    ...parsed,
                    testCases: (q.testCases || []).filter((tc: any) => !tc.isHidden),
                    starterCode: q.starterCode || parsed.starterCode,
                    difficulty: q.difficulty,
                };
            });
            return { problems, type: 'coding' };
        }

        // AI Generation
        try {
            const [easy, medium, hard] = await Promise.all([
                aiService.generateCodingQuestions(interview.stream, 'easy'),
                aiService.generateCodingQuestions(interview.stream, 'medium'),
                aiService.generateCodingQuestions(interview.stream, 'hard'),
            ]);

            const problems = [easy, medium, hard];
            const savedIds: string[] = [];
            for (const p of problems) {
                const saved = await Question.create({
                    interviewId: interview._id,
                    role: interview.stream,
                    type: 'coding',
                    stream: interview.stream,
                    difficulty: (p as any).difficulty,
                    content: JSON.stringify(p),
                    testCases: (p as any).testCases,
                    starterCode: (p as any).starterCode,
                    aiGenerated: true,
                });
                savedIds.push(saved._id.toString());
            }

            interview.rounds[2].data = { ...existingData, questionIds: savedIds };
            interview.markModified('rounds');
            await interview.save();

            const clientProblems = problems.map((p: any) => ({
                ...p,
                testCases: p.testCases?.filter((tc: any) => !tc.isHidden),
            }));
            return { problems: clientProblems, type: 'coding' };
        } catch (aiError) {
            console.warn(`[InterviewService] AI coding generation failed:`, aiError);
        }

        // Fallback
        if (allDbProblems.length >= 3) {
            const shuffled = allDbProblems.sort(() => Math.random() - 0.5).slice(0, 3);
            const questionIds = shuffled.map(q => q._id.toString());

            interview.rounds[2].data = { ...existingData, questionIds };
            interview.markModified('rounds');
            await interview.save();

            const problems = shuffled.map(q => {
                const parsed = JSON.parse(q.content);
                return {
                    ...parsed,
                    testCases: (q.testCases || []).filter((tc: any) => !tc.isHidden),
                    starterCode: q.starterCode || parsed.starterCode,
                    difficulty: q.difficulty,
                };
            });
            return { problems, type: 'coding' };
        }

        throw new Error('No coding questions available');

    } else {
        // ── CASE STUDY PATH ──
        const allDbCaseStudies = await Question.find({
            role: interview.stream,
            type: 'case-study',
            aiGenerated: false,
        });

        const unseenCaseStudies = allDbCaseStudies.filter(q => !seenQuestionIds.has(q._id.toString()));

        if (unseenCaseStudies.length >= 3) {
            const selected = unseenCaseStudies.sort(() => Math.random() - 0.5).slice(0, 3);
            const questionIds = selected.map(q => q._id.toString());

            interview.rounds[2].data = { ...existingData, questionIds };
            interview.markModified('rounds');
            await interview.save();

            const problems = selected.map(q => JSON.parse(q.content));
            return { problems, type: 'case-study' };
        }

        // AI Generation
        try {
            const caseStudies = await aiService.generateCaseStudyQuestions(interview.stream, 3);
            const savedIds: string[] = [];
            for (const cs of caseStudies as any[]) {
                const saved = await Question.create({
                    interviewId: interview._id,
                    role: interview.stream,
                    type: 'case-study',
                    stream: interview.stream,
                    difficulty: (cs as any).difficulty || 'medium',
                    content: JSON.stringify(cs),
                    aiGenerated: true,
                });
                savedIds.push(saved._id.toString());
            }

            interview.rounds[2].data = { ...existingData, questionIds: savedIds };
            interview.markModified('rounds');
            await interview.save();

            return { problems: caseStudies, type: 'case-study' };
        } catch (aiError) {
            console.warn(`[InterviewService] AI case study generation failed:`, aiError);
        }

        // Fallback
        if (allDbCaseStudies.length >= 3) {
            const fallback = allDbCaseStudies.sort(() => Math.random() - 0.5).slice(0, 3);
            const questionIds = fallback.map(q => q._id.toString());

            interview.rounds[2].data = { ...existingData, questionIds };
            interview.markModified('rounds');
            await interview.save();

            const problems = fallback.map(q => JSON.parse(q.content));
            return { problems, type: 'case-study' };
        }

        throw new Error('No case study questions available');
    }
};

import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
    interviewId?: mongoose.Types.ObjectId;
    role: string;
    type: 'mcq' | 'coding' | 'case-study' | 'behavioral';
    stream: string;
    difficulty: 'easy' | 'medium' | 'hard';
    content: string;
    options?: string[];
    correctAnswer?: string;
    testCases?: {
        input: string;
        expectedOutput: string;
        isHidden: boolean;
    }[];
    starterCode?: Record<string, string>;
    explanation?: string;
    aiGenerated: boolean;
    createdAt: Date;
}

const questionSchema = new Schema<IQuestion>(
    {
        interviewId: {
            type: Schema.Types.ObjectId,
            ref: 'Interview',
            required: false,
        },
        role: {
            type: String,
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['mcq', 'coding', 'case-study', 'behavioral'],
            required: true,
        },
        stream: {
            type: String,
            required: true,
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
        },
        content: {
            type: String,
            required: true,
        },
        options: [String],
        correctAnswer: String,
        testCases: [
            {
                input: String,
                expectedOutput: String,
                isHidden: { type: Boolean, default: false },
            },
        ],
        starterCode: {
            type: Schema.Types.Mixed,
            default: undefined,
        },
        explanation: String,
        aiGenerated: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient role-based queries
questionSchema.index({ role: 1, type: 1, difficulty: 1 });

export const Question = mongoose.model<IQuestion>('Question', questionSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IResult extends Document {
    interviewId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
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
    createdAt: Date;
}

const resultSchema = new Schema<IResult>(
    {
        interviewId: {
            type: Schema.Types.ObjectId,
            ref: 'Interview',
            required: true,
            unique: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        stream: {
            type: String,
            required: true,
        },
        totalScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        breakdown: {
            introduction: {
                score: { type: Number, default: 0 },
                maxScore: { type: Number, default: 100 },
                percentage: { type: Number, default: 0 },
            },
            aptitude: {
                score: { type: Number, default: 0 },
                maxScore: { type: Number, default: 100 },
                percentage: { type: Number, default: 0 },
            },
            technical: {
                score: { type: Number, default: 0 },
                maxScore: { type: Number, default: 100 },
                percentage: { type: Number, default: 0 },
            },
        },
        strengths: [String],
        weaknesses: [String],
        ratings: {
            communication: { type: Number, min: 0, max: 10 },
            technical: { type: Number, min: 0, max: 10 },
            problemSolving: { type: Number, min: 0, max: 10 },
            confidence: { type: Number, min: 0, max: 10 },
            overall: { type: Number, min: 0, max: 10 },
        },
        recommendation: {
            type: String,
            enum: ['strong-hire', 'hire', 'neutral', 'reject'],
            required: true,
        },
        aiReport: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

export const Result = mongoose.model<IResult>('Result', resultSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IRound {
    type: 'introduction' | 'aptitude' | 'technical';
    status: 'pending' | 'in-progress' | 'completed' | 'skipped';
    score: number;
    maxScore: number;
    startTime?: Date;
    endTime?: Date;
    data: Record<string, unknown>;
}

export interface IInterview extends Document {
    userId: mongoose.Types.ObjectId;
    stream: string;
    status: 'pending' | 'in-progress' | 'completed' | 'abandoned';
    currentRound: number;
    rounds: IRound[];
    totalScore: number;
    startTime: Date;
    endTime?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const roundSchema = new Schema<IRound>(
    {
        type: {
            type: String,
            enum: ['introduction', 'aptitude', 'technical'],
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'skipped'],
            default: 'pending',
        },
        score: { type: Number, default: 0 },
        maxScore: { type: Number, default: 100 },
        startTime: Date,
        endTime: Date,
        data: { type: Schema.Types.Mixed, default: {} },
    },
    { _id: false }
);

const interviewSchema = new Schema<IInterview>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        stream: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'abandoned'],
            default: 'pending',
        },
        currentRound: {
            type: Number,
            default: 0,
        },
        rounds: {
            type: [roundSchema],
            default: [
                { type: 'introduction', status: 'pending', score: 0, maxScore: 100, data: {} },
                { type: 'aptitude', status: 'pending', score: 0, maxScore: 100, data: {} },
                { type: 'technical', status: 'pending', score: 0, maxScore: 100, data: {} },
            ],
        },
        totalScore: {
            type: Number,
            default: 0,
        },
        startTime: {
            type: Date,
            default: Date.now,
        },
        endTime: Date,
    },
    {
        timestamps: true,
    }
);

export const Interview = mongoose.model<IInterview>('Interview', interviewSchema);

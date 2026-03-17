import mongoose, { Schema, Document } from 'mongoose';

export interface ICheatLog extends Document {
    interviewId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    type: 'tab_switch' | 'no_face' | 'multi_face' | 'copy_paste' | 'fullscreen_exit' | 'suspicious_audio';
    details: string;
    timestamp: Date;
}

const cheatLogSchema = new Schema<ICheatLog>(
    {
        interviewId: {
            type: Schema.Types.ObjectId,
            ref: 'Interview',
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['tab_switch', 'no_face', 'multi_face', 'copy_paste', 'fullscreen_exit', 'suspicious_audio'],
            required: true,
        },
        details: {
            type: String,
            default: '',
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

export const CheatLog = mongoose.model<ICheatLog>('CheatLog', cheatLogSchema);

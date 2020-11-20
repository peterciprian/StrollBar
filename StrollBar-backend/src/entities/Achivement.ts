import { Schema, Document, model } from 'mongoose';
import { IStroll } from './Stroll';

export interface IAchivement extends Document {
    achivementId: string;
    strolls: IStroll['strollId'];
    score: number;
    time: number;
    completed: boolean;
    hintsUsed: number;
}

const AchivementSchema = new Schema<IAchivement>({
    achivementId: {
        type: Schema.Types.ObjectId,
        required: true,
        unique: true,
    },
    strolls: [{
        stroll: {
            type: Schema.Types.ObjectId,
            ref: 'Stroll',
            required: true
        }
    }],
    score: {
        type: Number,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    completed: {
        type: Boolean,
        required: true
    },
    hintsUsed: {
        type: Number,
        required: true
    }
},
    {
        timestamps: true
    }
);

export default model<IAchivement>("Achivement", AchivementSchema);
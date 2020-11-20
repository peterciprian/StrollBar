import { Schema, Document, model } from 'mongoose';
import { IStroll } from './Stroll';

export interface IStage extends Document {
    stageId: number;
    name: string;
    description: string;
    notes?: string[];
    pictureUrls?: string[];
    videoUrls?: string[];
    address?: string;
    coords?: {
        x: number,
        y: number
    };
    task: string;
    score: number;
    timeLimit?: number;
    hints: IHint[];
    stroll: IStroll['strollId'][];
}

export interface IHint {
    description: string;
    imageUrls: string[];
    videoUrls: string[];
    price: number;
    used: boolean;
}

const StageSchema = new Schema<IStage>({
    stageId: {
        type: Schema.Types.ObjectId,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    notes: {
        type: Schema.Types.Array,
        required: false
    },
    pictureUrls: {
        type: Schema.Types.Array,
        required: false
    },
    videoUrls: {
        type: Schema.Types.Array,
        required: false
    },
    address: {
        type: String,
        required: true
    },
    coords: {
        x: {
            type: Number,
            required: true
        },
        y: {
            type: Number,
            required: true
        }
    },
    task: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    timeLimit: {
        type: Number,
        required: false
    },
    hints: {
        type: Schema.Types.Array,
        required: false
    },
    stroll: {
        type: Schema.Types.ObjectId,
        ref: 'Stroll',
        required: true
    }

},
    { timestamps: true }
);

export default model<IStage>('Stage', StageSchema);

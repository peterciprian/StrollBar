import { Schema, Document, model } from 'mongoose';
import { IStage } from './Stage';
import { IUser } from './User';

export interface IStroll extends Document {
    strollId: string;
    name: string;
    author: string | IUser;
    active: boolean;
    price: IPrice;
    stages: IStage['stageId'][];
    recommended: string[];
    labels: string[];
    description: string;
    timeLimit: number;
    avgTime: number;
    record: number;
    maxScore: number;
    completed: number;
}

export interface IPrice {
    amount: number;
    currency: string;
}

const StrollSchema = new Schema<IStroll>({
    strollId: {
        type: Schema.Types.ObjectId,
        required: true,
        unique: true,
    },
    name: {
        type: Schema.Types.String,
        required: true
    },
    author: {
        type: Schema.Types.Mixed,
        required: true
    },
    active: {
        type: Boolean,
        required: true
    },
    price: {
        type: Schema.Types.Mixed,
        required: true
    },
    stages: [{
        item: {
            type: Schema.Types.ObjectId,
            ref: 'Stage',
            required: true
        }
    }],
    recommended: {
        type: Schema.Types.Array,
        required: true
    },
    labels: {
        type: Schema.Types.Array,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    timeLimit: {
        type: Number,
        required: true
    },
    avgTime: {
        type: Number,
        required: true
    },
    record: {
        type: Number,
        required: true
    },
    maxScore: {
        type: Number,
        required: true
    },
    completed: {
        type: Number,
        required: true
    }
},
    {
        timestamps: true
    });

export default model<IStroll>("Stroll", StrollSchema);
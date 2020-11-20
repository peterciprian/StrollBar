import { Schema, Document, model } from 'mongoose';
import { IAchivement } from './Achivement';
import { IStroll } from './Stroll';

export interface IUser extends Document {
    userId: string;
    username: string;
    email: string;
    role: string;
    billing: {
        address: {
            billingName: string;
            taxNumber?: string;
            country: string;
            zip: number;
            city: string;
            street: string;
            number: number;
            else: string;
        }
    }
    rank: number;
    active: boolean;
    confirmed: boolean;
    strolls: IStroll['strollId'][];
    achivements: IAchivement['achivementId'][];
}
const UserSchema = new Schema<IUser>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        unique: true,
    },
    username: {
        type: Schema.Types.String,
        required: true
    },
    email: {
        type: Schema.Types.String,
        required: true
    },
    role: {
        type: Schema.Types.String,
        required: true
    },
    billing: {
        address: {
            billingName: {
                type: String,
                required: true
            },
            taxNumber: {
                type: Number,
                required: false
            },
            country: {
                type: String,
                required: true
            },
            zip: {
                type: Number,
                required: true
            },
            city: {
                type: String,
                required: true
            },
            street: {
                type: String,
                required: true
            },
            number: {
                type: Number,
                required: true
            },
            else: {
                type: String,
                required: true
            },
        }
    },
    rank: {
        type: Number,
        required: false
    },
    active: {
        type: Boolean,
        required: true
    },
    confirmed: {
        type: Boolean,
        required: true
    },
    strolls: [{
        item: {
            type: Schema.Types.ObjectId,
            ref: 'Stage',
            required: true
        }
    }],
    achivements: [{
        achivement: {
            type: Schema.Types.ObjectId,
            ref: 'Achivement',
            required: true
        }
    }],
});

export default model<IUser>("User", UserSchema);
import { IAchievement } from './Achievement';
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
        },
    };
    rank: number;
    active: boolean;
    confirmed: boolean;
    strolls: IStroll['strollId'][];
    achievements: IAchievement ['achievementId'][];
  }

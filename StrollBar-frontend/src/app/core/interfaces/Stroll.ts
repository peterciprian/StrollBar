import { IStage } from './Stage';
import { IUser } from './Users';

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

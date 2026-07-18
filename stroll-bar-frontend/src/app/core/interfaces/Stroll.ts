import { IStage } from './Stage';
import { IUser } from './Users';

export interface IStroll extends Document {
    strollId: string;
    name: string;
    author: string | IUser;
    active: boolean;
    price: IPrice;
    stages: IStage['stageId'][];
    recommended: recommends[];
    labels: labels[];
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

export enum labels {
  ARCHITECTURE,
  ART,
  COMTEMPORARY,
  HISTORICAL,
  GASTRO,
  BUILDING,
  SIGHTSEEING,
  SCIENCE,
  LANDSCAPE,
  URBANISM
}

export enum recommends {
  CHILD,
  ELDERLY,
  ACCESIBLE,
  LMBTQX,
  DOG,
  ADULT
}

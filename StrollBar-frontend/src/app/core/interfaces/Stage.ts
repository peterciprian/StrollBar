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
        y: number,
    };
    task: string;
    score: number;
    timeLimit?: number;
    hints: IHint[];
}

export interface IHint {
    description: string;
    imageUrls: string[];
    videoUrls: string[];
    price: number;
    used: boolean;
}

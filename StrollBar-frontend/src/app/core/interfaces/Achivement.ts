import { IStroll } from './Stroll';

export interface IAchivement extends Document {
  achivementId: string;
  strolls: IStroll['strollId'];
  score: number;
  time: number;
  completed: boolean;
  hintsUsed: number;
}

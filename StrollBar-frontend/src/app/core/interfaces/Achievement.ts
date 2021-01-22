import { IStroll } from './Stroll';

export interface IAchievement extends Document {
  achievementId: string;
  strolls: IStroll['strollId'];
  score: number;
  time: number;
  completed: boolean;
  hintsUsed: number;
}

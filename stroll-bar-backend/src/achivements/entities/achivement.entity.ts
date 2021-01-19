import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IStroll } from 'src/strolls/entities/stroll.entity';

export interface IAchivement extends Document {
  achivementId: string;
  stroll: IStroll['strollId'];
  score: number;
  time: number;
  completed: boolean;
  hintsUsed: number;
}

@Schema()
export class Achivement extends Document {
  @Prop({ required: true, unique: true })
  achivementId: string;

  @Prop({ type: Types.ObjectId, ref: 'Stroll', required: true })
  stroll: string;

  @Prop()
  score: number;

  @Prop()
  time: number;

  @Prop({ required: true })
  completed: boolean;

  @Prop()
  hintsUsed: number;
}

export const AchivementSchema = SchemaFactory.createForClass(Achivement);

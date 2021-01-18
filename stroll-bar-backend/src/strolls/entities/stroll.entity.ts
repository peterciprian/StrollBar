import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

@Schema()
export class Stroll extends Document {
  @Prop({ required: true, unique: true })
  strollId: string;

  @Prop()
  name: string;

  @Prop({ unique: true })
  author: string;

  @Prop({ required: true })
  active: boolean;

  @Prop({ required: true })
  price: IPrice;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Stage' }], required: true })
  stages: IStage[];

  @Prop()
  recommended: Array<string>;

  @Prop()
  labels: Array<string>;

  @Prop({ required: true })
  description: string;

  @Prop()
  timeLimit: number;

  @Prop()
  avgTime: number;

  @Prop()
  record: number;

  @Prop()
  maxScore: number;

  @Prop()
  completed: number;
}

export const StrollSchema = SchemaFactory.createForClass(Stroll);

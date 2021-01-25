import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IStage } from 'src/stages/entities/stage.entity';
import { IUser } from 'src/users/entities/user.entity';

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
  URBANISM,
}

export enum recommends {
  CHILD,
  ELDERLY,
  ACCESIBLE,
  LMBTQX,
  DOG,
  ADULT,
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

  @Prop({ type: Object, required: true })
  price: IPrice;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Stage' }], required: true })
  stages: string[];

  @Prop()
  recommended: Array<recommends>;

  @Prop()
  labels: Array<labels>;

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

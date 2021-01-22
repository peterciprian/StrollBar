import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface IStage extends Document {
  stageId: string;
  name: string;
  description: string;
  notes?: string[];
  pictureUrls?: string[];
  videoUrls?: string[];
  address?: string;
  coords?: ICoordinates;
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

export interface ICoordinates {
  x: number;
  y: number;
}

@Schema()
export class Stage extends Document {
  @Prop({ required: true, unique: true })
  stageId: string;

  @Prop()
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  notes: Array<string>;

  @Prop()
  pictureUrls: Array<string>;

  @Prop()
  videoUrls: Array<string>;

  @Prop()
  address: string;

  @Prop({ type: Object })
  coords: ICoordinates;

  @Prop({ required: true })
  task: string;

  @Prop()
  score: number;

  @Prop()
  timeLimit: number;

  @Prop()
  hints: Array<IHint>;
}

export const StageSchema = SchemaFactory.createForClass(Stage);

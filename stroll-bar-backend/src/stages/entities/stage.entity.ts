import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IStroll } from 'src/strolls/entities/stroll.entity';

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
  stroll: IStroll['strollId'][];
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
  coords: ICoordinates;

  @Prop({ required: true })
  task: string;

  @Prop()
  score: number;

  @Prop()
  timeLimit: number;

  @Prop()
  hints: Array<IHint>;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Stroll' }], required: true })
  stroll: string[];
}

export const StageSchema = SchemaFactory.createForClass(Stage);

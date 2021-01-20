import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAchivement } from 'src/achivements/entities/achivement.entity';
import { IStroll } from 'src/strolls/entities/stroll.entity';

export interface IUser extends Document {
  userId: string;
  username: string;
  email: string;
  role: string;
  billing: IBillingAddress;
  rank: number;
  active: boolean;
  confirmed: boolean;
  strolls: IStroll['strollId'][];
  achivements: IAchivement['achivementId'][];
}
export interface IBillingAddress {
  billingName: string;
  taxNumber?: string;
  country: string;
  zip: number;
  city: string;
  street: string;
  number: number;
  else: string;
}

@Schema()
export class User extends Document {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  role: string;

  @Prop({ type: Object, required: true })
  billing: IBillingAddress;

  @Prop({ required: true })
  rank: number;

  @Prop({ required: true })
  active: boolean;

  @Prop({ required: true })
  confirmed: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Stroll' }], required: true })
  strolls: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Achivement' }], required: true })
  achivements: string[];
}
export const UserSchema = SchemaFactory.createForClass(User);

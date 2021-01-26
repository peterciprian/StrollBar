import {
  MaxLength,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsNumber,
  IsEmail,
  MinLength,
} from 'class-validator';
import { IBillingAddress } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @MaxLength(30)
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  role: string;

  @IsNotEmpty()
  billing: IBillingAddress;

  @IsNotEmpty()
  @IsNumber()
  rank: number;

  @IsNotEmpty()
  @IsBoolean()
  active: boolean;

  @IsNotEmpty()
  @IsBoolean()
  confirmed: boolean;

  @IsNotEmpty()
  strolls: string[];

  @IsNotEmpty()
  achievements: string[];
}

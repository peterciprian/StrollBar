import {
  MaxLength,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { IPrice } from '../entities/stroll.entity';

export class CreateStrollDto {
  @IsString()
  @IsNotEmpty()
  readonly strollId: string;

  @IsString()
  @MaxLength(30)
  @IsNotEmpty()
  readonly name: string;

  readonly author: string;

  @IsBoolean()
  @IsNotEmpty()
  readonly active: boolean;

  @IsNotEmpty()
  readonly price: IPrice;

  @IsNotEmpty()
  readonly stages: string[];

  readonly recommended: string[];

  readonly labels: string[];

  @IsString()
  @MaxLength(2000)
  @IsNotEmpty()
  readonly description: string;

  @IsNumber()
  readonly timeLimit: number;

  @IsNumber()
  readonly avgTime: number;

  @IsNumber()
  readonly record: number;

  @IsNumber()
  readonly maxScore: number;

  @IsNumber()
  readonly completed: number;
}

import { MaxLength, IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { ICoordinates, IHint } from '../entities/stage.entity';

export class CreateStageDto {
  @IsString()
  @IsNotEmpty()
  readonly stageId: string;

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @MaxLength(2000)
  @IsNotEmpty()
  readonly description: string;

  readonly notes?: string[];

  readonly pictureUrls?: string[];

  readonly videoUrls?: string[];

  @IsString()
  @MaxLength(500)
  readonly address?: string;

  readonly coords?: ICoordinates;

  @IsString()
  @MaxLength(2000)
  readonly task: string;

  @IsNumber()
  readonly score: number;

  @IsNumber()
  readonly timeLimit?: number;

  readonly hints: IHint[];
}

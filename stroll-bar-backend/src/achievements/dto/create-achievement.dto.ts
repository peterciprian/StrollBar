import {
  MaxLength,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateAchievementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly achievementId: string;

  @IsNotEmpty()
  readonly stroll: string;

  @IsNumber()
  readonly score: number;

  @IsNumber()
  readonly time: number;

  @IsBoolean()
  readonly completed: boolean;

  @IsNumber()
  readonly hintsUsed: number;
}

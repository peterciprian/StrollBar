import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { PaidPlan } from '../entities/paid-grant.entity';

export class CreatePaidGrantDto {
	@ApiProperty({ enum: PaidPlan })
	@IsEnum(PaidPlan)
	plan!: PaidPlan;

	@ApiProperty({ format: 'date-time' })
	@IsISO8601({ strict: true })
	@Matches(/Z$/)
	startsAt!: string;

	@ApiProperty({ format: 'date-time' })
	@IsISO8601({ strict: true })
	@Matches(/Z$/)
	expiresAt!: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	@MaxLength(2000)
	reason!: string;
}

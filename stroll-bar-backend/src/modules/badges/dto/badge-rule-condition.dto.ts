import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BADGE_METRICS, BADGE_OPERATORS, BadgeMetric, BadgeOperator } from '../badge-rules';

export class BadgeRuleConditionDto {
	@ApiProperty({ enum: BADGE_METRICS, example: 'completedStrollsCount' })
	@IsIn(BADGE_METRICS)
	metric!: BadgeMetric;

	@ApiProperty({ enum: BADGE_OPERATORS, example: 'gte' })
	@IsIn(BADGE_OPERATORS)
	operator!: BadgeOperator;

	@ApiProperty({ example: 5, description: 'A number for most metrics, or a StrollCategory name for categoryCompleted.' })
	value!: number | string;
}

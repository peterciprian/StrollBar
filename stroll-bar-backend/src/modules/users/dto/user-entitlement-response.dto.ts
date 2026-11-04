import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';
import { PaidGrantStatus, PaidPlan } from '../entities/paid-grant.entity';

class OwnPaidGrantResponseDto {
	@ApiProperty({ format: 'uuid' })
	id!: string;
	@ApiProperty({ enum: PaidPlan })
	plan!: PaidPlan;
	@ApiProperty({ enum: PaidGrantStatus })
	status!: PaidGrantStatus;
	@ApiProperty({ format: 'date-time' })
	startsAt!: string;
	@ApiProperty({ format: 'date-time' })
	expiresAt!: string;
	@ApiProperty({ format: 'date-time', nullable: true })
	cancelledAt!: string | null;
}

export class UserEntitlementResponseDto {
	@ApiProperty({ enum: UserRole })
	plan!: UserRole;

	@ApiProperty({ format: 'date-time', nullable: true })
	paidThroughAt!: string | null;

	@ApiProperty({ enum: UserRole, nullable: true })
	fallbackPlan!: UserRole | null;

	@ApiProperty({ type: [OwnPaidGrantResponseDto] })
	paidGrants!: OwnPaidGrantResponseDto[];

	@ApiProperty({ type: 'object', additionalProperties: { type: 'number', nullable: true } })
	creationLimits!: { public: number | null; private: number | null };

	@ApiProperty({ type: 'object', additionalProperties: { type: 'number', nullable: true } })
	creationUsage!: { public: number; private: number };

	@ApiProperty({ type: 'object', additionalProperties: { type: 'number', nullable: true } })
	purchaseLimits!: { public: number | null; private: number | null };

	@ApiProperty({ type: 'object', additionalProperties: { type: 'number', nullable: true } })
	purchaseUsage!: { public: number; private: number };
}

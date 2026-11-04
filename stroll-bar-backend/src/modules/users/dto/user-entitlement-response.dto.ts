import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class UserEntitlementResponseDto {
	@ApiProperty({ enum: UserRole })
	plan!: UserRole;

	@ApiProperty({ format: 'date-time', nullable: true })
	paidThroughAt!: string | null;

	@ApiProperty({ type: 'object', additionalProperties: { type: 'number', nullable: true } })
	creationLimits!: { public: number | null; private: number | null };

	@ApiProperty({ type: 'object', additionalProperties: { type: 'number', nullable: true } })
	creationUsage!: { public: number; private: number };

	@ApiProperty({ type: 'object', additionalProperties: { type: 'number', nullable: true } })
	purchaseLimits!: { public: number | null; private: number | null };

	@ApiProperty({ type: 'object', additionalProperties: { type: 'number', nullable: true } })
	purchaseUsage!: { public: number; private: number };
}

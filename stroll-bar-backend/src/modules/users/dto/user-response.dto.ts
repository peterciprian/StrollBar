import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class UserResponseDto {
	@ApiProperty({ example: 'f7f3eb6a-711b-49e8-ae60-b7af77fa35c6' })
	id!: string;

	@ApiProperty({ example: 'walker' })
	username!: string;

	@ApiProperty({ example: 'walker@example.com' })
	email!: string;

	@ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', nullable: true })
	profileImageUrl?: string | null;

	@ApiProperty({ example: true })
	isActive!: boolean;

	@ApiProperty({ enum: UserRole, example: UserRole.SIMPLE })
	role!: UserRole;

	@ApiProperty({ example: false })
	emailVerified!: boolean;

	@ApiProperty({ example: '2026-07-18T16:00:00.000Z' })
	createdAt!: string;

	@ApiProperty({ example: '2026-07-18T16:05:00.000Z' })
	updatedAt!: string;
}

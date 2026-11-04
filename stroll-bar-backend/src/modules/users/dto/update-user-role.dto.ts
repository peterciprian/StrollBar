import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateUserRoleDto {
	@ApiProperty({ enum: [UserRole.SIMPLE, UserRole.ADMIN], description: 'Independent ADMIN assignment/removal only. Paid plans require an expiring grant.' })
	@IsIn([UserRole.SIMPLE, UserRole.ADMIN])
	role!: UserRole;
}

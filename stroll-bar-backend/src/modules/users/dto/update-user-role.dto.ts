import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateUserRoleDto {
	@ApiProperty({ enum: UserRole })
	@IsEnum(UserRole)
	role!: UserRole;
}

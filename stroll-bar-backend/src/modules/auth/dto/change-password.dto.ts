import { ApiProperty } from '@nestjs/swagger';
import { IsNotIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
	COMMON_PASSWORDS,
	COMMON_PASSWORD_MESSAGE,
	PASSWORD_COMPLEXITY_PATTERN,
	PASSWORD_POLICY_MESSAGE
} from '../../../common/utils/password-policy.util';

export class ChangePasswordDto {
	@ApiProperty({ example: 'CurrentPass123!' })
	@IsString()
	@MinLength(1)
	@MaxLength(128)
	currentPassword!: string;

	@ApiProperty({ example: 'EvenBetterPass123!', minLength: 8, maxLength: 128 })
	@IsString()
	@MinLength(8)
	@MaxLength(128)
	@Matches(PASSWORD_COMPLEXITY_PATTERN, { message: PASSWORD_POLICY_MESSAGE })
	@IsNotIn(COMMON_PASSWORDS, { message: COMMON_PASSWORD_MESSAGE })
	newPassword!: string;
}

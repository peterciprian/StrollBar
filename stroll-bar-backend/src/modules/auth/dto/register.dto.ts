import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
	COMMON_PASSWORDS,
	COMMON_PASSWORD_MESSAGE,
	PASSWORD_COMPLEXITY_PATTERN,
	PASSWORD_POLICY_MESSAGE
} from '../../../common/utils/password-policy.util';

export class RegisterDto {
	@ApiProperty({ example: 'walker', minLength: 3, maxLength: 50 })
	@IsString()
	@MinLength(3)
	@MaxLength(50)
	username!: string;

	@ApiProperty({ example: 'walker@example.com', format: 'email' })
	@IsEmail()
	email!: string;

	@ApiProperty({ example: 'Password123!', minLength: 8, maxLength: 128 })
	@IsString()
	@MinLength(8)
	@MaxLength(128)
	@Matches(PASSWORD_COMPLEXITY_PATTERN, { message: PASSWORD_POLICY_MESSAGE })
	@IsNotIn(COMMON_PASSWORDS, { message: COMMON_PASSWORD_MESSAGE })
	password!: string;

	@ApiPropertyOptional({ description: 'Google reCAPTCHA v3 token, required when captcha protection is enabled.' })
	@IsOptional()
	@IsString()
	recaptchaToken?: string;
}

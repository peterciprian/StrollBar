import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthUserResponseDto extends UserResponseDto {
	@ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', nullable: true })
	declare profileImageUrl?: string | null;
}

export class AuthResponseDto {
	@ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
	accessToken!: string;

	@ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...' })
	refreshToken!: string;

	@ApiProperty({ type: AuthUserResponseDto })
	user!: AuthUserResponseDto;

	@ApiPropertyOptional({ example: 'f3b91791b6e7d8f565d7d8f565f3b91791b6e7d8f565d7d8f565f3b91791b6' })
	verificationToken?: string;
}

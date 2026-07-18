import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PublicUserProfileUserDto {
  @ApiProperty({ example: 'f7f3eb6a-711b-49e8-ae60-b7af77fa35c6' })
  id!: string;

  @ApiProperty({ example: 'walker' })
  username!: string;

  @ApiProperty({ example: 'walker@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', nullable: true })
  profileImageUrl?: string | null;
}

class PublicUserProfileStatsDto {
  @ApiProperty({ example: 3 })
  publishedStrolls!: number;

  @ApiProperty({ example: 42 })
  unlockCount!: number;

  @ApiProperty({ example: 17 })
  completionCount!: number;
}

export class PublicUserProfileResponseDto {
  @ApiProperty({ type: PublicUserProfileUserDto })
  user!: PublicUserProfileUserDto;

  @ApiProperty({ type: PublicUserProfileStatsDto })
  stats!: PublicUserProfileStatsDto;
}

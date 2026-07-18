import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { PublicUserProfileResponseDto } from './dto/public-user-profile-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get a public user profile' })
  @ApiParam({ name: 'userId' })
  @ApiOkResponse({ type: PublicUserProfileResponseDto, description: 'Public user profile with stats.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'User not found.' })
  @Get(':userId')
  getPublicProfile(@Param('userId') userId: string) {
    return this.usersService.getPublicProfile(userId);
  }
}

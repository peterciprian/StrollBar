import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { PublicUserProfileResponseDto } from './dto/public-user-profile-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: "Update the authenticated user's profile" })
	@ApiOkResponse({ type: UserResponseDto, description: 'Updated user profile.' })
	@ApiNotFoundResponse({ description: 'No active user found.', type: ErrorResponseDto })
	@ApiConflictResponse({ description: 'Username is already taken.', type: ErrorResponseDto })
	@UseGuards(JwtAuthGuard)
	@Patch('me')
	updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserDto) {
		return this.usersService.updateMe(user.userId, dto);
	}

	@ApiOperation({ summary: 'Get a public user profile' })
	@ApiParam({ name: 'userId' })
	@ApiOkResponse({ type: PublicUserProfileResponseDto, description: 'Public user profile with stats.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'User not found.' })
	@Get(':userId')
	getPublicProfile(@Param('userId') userId: string) {
		return this.usersService.getPublicProfile(userId);
	}
}

import { Body, Controller, Get, Header, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
	ApiBearerAuth,
	ApiConflictResponse,
	ApiForbiddenResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiTags
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { PublicUserProfileResponseDto } from './dto/public-user-profile-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { CreatePaidGrantDto } from './dto/create-paid-grant.dto';
import { RoleAssignmentsService } from './role-assignments.service';
import { RevokePaidGrantDto } from './dto/revoke-paid-grant.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService, private readonly roleAssignments: RoleAssignmentsService) {}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'List all users (admin only)' })
	@ApiOkResponse({ type: [UserResponseDto], description: 'All registered users.' })
	@ApiForbiddenResponse({ description: 'Administrator access required.', type: ErrorResponseDto })
	@UseGuards(JwtAuthGuard)
	@Get()
	@Header('Cache-Control', 'no-store')
	listUsers(@CurrentUser() user: AuthenticatedUser) {
		return this.usersService.listAll(user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: "Update the authenticated user's profile" })
	@ApiOkResponse({ type: UserResponseDto, description: 'Updated user profile.' })
	@ApiNotFoundResponse({ description: 'No active user found.', type: ErrorResponseDto })
	@ApiConflictResponse({ description: 'Username is already taken.', type: ErrorResponseDto })
	@UseGuards(JwtAuthGuard)
	@Patch('me')
	@Header('Cache-Control', 'no-store')
	updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserDto) {
		return this.usersService.updateMe(user.userId, dto);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Assign/remove independent, non-expiring ADMIN privilege (admin only; paid roles require grants)' })
	@ApiOkResponse({ type: UserResponseDto, description: 'Updated user role.' })
	@ApiForbiddenResponse({ description: 'Administrator access required.', type: ErrorResponseDto })
	@ApiNotFoundResponse({ description: 'User not found.', type: ErrorResponseDto })
	@UseGuards(JwtAuthGuard)
	@Patch(':userId/role')
	@Header('Cache-Control', 'no-store')
	updateRole(@Param('userId') userId: string, @Body() dto: UpdateUserRoleDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
		return this.usersService.updateRole(userId, dto.role, user, request.ip);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Record an expiring paid grant (admin only; evaluated on subsequent requests)' })
	@UseGuards(JwtAuthGuard)
	@Post(':userId/paid-grants')
	createPaidGrant(@Param('userId') userId: string, @Body() dto: CreatePaidGrantDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
		return this.roleAssignments.createGrant(userId, dto, user, request.ip);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Revoke one paid grant without changing ADMIN or other grants (admin only)' })
	@UseGuards(JwtAuthGuard)
	@Post(':userId/paid-grants/:grantId/revoke')
	revokePaidGrant(@Param('userId') userId: string, @Param('grantId') grantId: string, @Body() dto: RevokePaidGrantDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
		return this.roleAssignments.revokeGrant(userId, grantId, dto.reason, user, request.ip);
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

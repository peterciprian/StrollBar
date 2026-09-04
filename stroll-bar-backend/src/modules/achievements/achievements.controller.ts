import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AchievementResponseDto } from './dto/achievement-response.dto';
import { AdventureResultResponseDto } from './dto/adventure-result-response.dto';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { AchievementsService } from './achievements.service';
import { AdventureResultsService } from './adventure-results.service';

@ApiTags('Achievements')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('achievements')
export class AchievementsController {
	constructor(
		private readonly achievementsService: AchievementsService,
		private readonly adventureResultsService: AdventureResultsService
	) {}

	@ApiOperation({ summary: 'Record a new achievement for the current user' })
	@ApiCreatedResponse({ type: AchievementResponseDto, description: 'Achievement recorded successfully.' })
	@Post()
	create(@Body() dto: CreateAchievementDto, @CurrentUser() user: AuthenticatedUser) {
		return this.achievementsService.create(dto, user.userId);
	}

	@ApiOperation({ summary: 'List all achievements for the current user' })
	@ApiOkResponse({ type: AchievementResponseDto, isArray: true, description: 'User achievement list.' })
	@Get()
	findAll(@CurrentUser() user: AuthenticatedUser) {
		return this.achievementsService.findAllForUser(user.userId);
	}

	@ApiOperation({ summary: 'List all completed-adventure results for the current user, grouped by stroll' })
	@ApiOkResponse({ type: AdventureResultResponseDto, isArray: true, description: 'User adventure result list.' })
	@Get('results')
	findAllResults(@CurrentUser() user: AuthenticatedUser) {
		return this.adventureResultsService.findAllForUser(user.userId);
	}

	@ApiOperation({ summary: 'Get a single achievement by ID' })
	@ApiParam({ name: 'achievementId' })
	@ApiOkResponse({ type: AchievementResponseDto, description: 'Achievement details.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Achievement not found.' })
	@Get(':achievementId')
	findOne(@Param('achievementId') achievementId: string, @CurrentUser() user: AuthenticatedUser) {
		return this.achievementsService.findOne(achievementId, user.userId);
	}
}

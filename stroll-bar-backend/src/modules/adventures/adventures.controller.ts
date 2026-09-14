import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
	ApiBadRequestResponse,
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiTags
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AdventureDetailResponseDto } from './dto/adventure-detail-response.dto';
import { AdventureResponseDto } from './dto/adventure-response.dto';
import { AssignAdventureDto } from './dto/assign-adventure.dto';
import { NavigateAdventureDto } from './dto/navigate-adventure.dto';
import { SubmitStageAnswerResponseDto } from './dto/submit-stage-answer-response.dto';
import { SubmitStageAnswerDto } from './dto/submit-stage-answer.dto';
import { UnlockStrollDto } from './dto/unlock-stroll.dto';
import { AdventuresService } from './adventures.service';

@ApiTags('Adventures')
@Controller('adventures')
export class AdventuresController {
	constructor(private readonly adventuresService: AdventuresService) {}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'List adventures owned by the authenticated user' })
	@ApiOkResponse({ type: [AdventureDetailResponseDto], description: 'Owned adventures with stroll and current-stage details.' })
	@UseGuards(JwtAuthGuard)
	@Get()
	list(@CurrentUser() user: AuthenticatedUser) {
		return this.adventuresService.list(user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'List every adventure across all users (admin only)' })
	@ApiOkResponse({ description: 'All adventures with owner and stroll details.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Administrator access required.' })
	@UseGuards(JwtAuthGuard)
	@Get('admin')
	listAllAdmin(@CurrentUser() user: AuthenticatedUser) {
		return this.adventuresService.listAllForAdmin(user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Assign a stroll to a user (admin only)' })
	@ApiCreatedResponse({ type: AdventureResponseDto, description: 'Adventure assigned successfully.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Administrator access required, or the stroll is archived.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Stroll or user not found.' })
	@UseGuards(JwtAuthGuard)
	@Post('admin/assign')
	assign(@Body() dto: AssignAdventureDto, @CurrentUser() user: AuthenticatedUser) {
		return this.adventuresService.assignAdventure(dto, user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: "Revoke a user's adventure (admin only)" })
	@ApiParam({ name: 'adventureId' })
	@ApiOkResponse({ type: AdventureResponseDto, description: 'Adventure revoked successfully.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Administrator access required.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Adventure not found.' })
	@UseGuards(JwtAuthGuard)
	@Delete('admin/:adventureId')
	revoke(@Param('adventureId') adventureId: string, @CurrentUser() user: AuthenticatedUser) {
		return this.adventuresService.revokeAdventure(adventureId, user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Unlock a stroll as an adventure' })
	@ApiCreatedResponse({ type: AdventureResponseDto, description: 'Adventure unlocked successfully.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Email not verified, or the purchase quota for your account type is reached.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Stroll not found.' })
	@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
	@Post('unlock')
	unlock(@Body() dto: UnlockStrollDto, @CurrentUser() user: AuthenticatedUser) {
		return this.adventuresService.unlock(dto, user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Start an unlocked adventure' })
	@ApiParam({ name: 'adventureId' })
	@ApiCreatedResponse({ type: AdventureResponseDto, description: 'Adventure started successfully.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'You are not allowed to access this adventure.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Adventure not found.' })
	@UseGuards(JwtAuthGuard)
	@Post(':adventureId/start')
	start(@Param('adventureId') adventureId: string, @CurrentUser() user: AuthenticatedUser) {
		return this.adventuresService.start(adventureId, user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Get an adventure with its current stage' })
	@ApiParam({ name: 'adventureId' })
	@ApiOkResponse({ type: AdventureDetailResponseDto, description: 'Adventure details with current stage.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'You are not allowed to access this adventure.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Adventure not found.' })
	@UseGuards(JwtAuthGuard)
	@Get(':adventureId')
	get(@Param('adventureId') adventureId: string, @CurrentUser() user: AuthenticatedUser) {
		return this.adventuresService.get(adventureId, user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Get a completed adventure result' })
	@ApiParam({ name: 'adventureId' })
	@ApiOkResponse({ description: 'Adventure completion metrics.' })
	@UseGuards(JwtAuthGuard)
	@Get(':adventureId/result')
	getResult(@Param('adventureId') adventureId: string, @CurrentUser() user: AuthenticatedUser) {
		return this.adventuresService.getResult(adventureId, user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Submit a stage answer and advance progress if correct' })
	@ApiParam({ name: 'adventureId' })
	@ApiParam({ name: 'stageId' })
	@ApiCreatedResponse({ type: SubmitStageAnswerResponseDto, description: 'Stage answer processed successfully.' })
	@ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Validation failed.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'You are not allowed to access this adventure.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Adventure or stage not found.' })
	@UseGuards(JwtAuthGuard)
	@Post(':adventureId/stages/:stageId/answer')
	submitAnswer(
		@Param('adventureId') adventureId: string,
		@Param('stageId') stageId: string,
		@Body() dto: SubmitStageAnswerDto,
		@CurrentUser() user: AuthenticatedUser
	) {
		return this.adventuresService.submitAnswer(adventureId, stageId, dto, user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Move to the next or previous stage without submitting an answer' })
	@ApiParam({ name: 'adventureId' })
	@ApiCreatedResponse({ type: AdventureDetailResponseDto, description: 'Adventure stage updated successfully.' })
	@ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Validation failed.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'You are not allowed to access this adventure.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Adventure not found.' })
	@UseGuards(JwtAuthGuard)
	@Post(':adventureId/navigate')
	navigate(@Param('adventureId') adventureId: string, @Body() dto: NavigateAdventureDto, @CurrentUser() user: AuthenticatedUser) {
		return this.adventuresService.navigate(adventureId, dto, user);
	}
}

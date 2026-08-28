import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateStageDto } from './dto/create-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { ReorderStagesResponseDto } from './dto/reorder-stages-response.dto';
import { StageResponseDto } from './dto/stage-response.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { StagesService } from './stages.service';

@ApiTags('Stages')
@Controller('strolls/:strollId/stages')
export class StagesController {
	constructor(private readonly stagesService: StagesService) {}

	@ApiOperation({ summary: 'List all stages for a stroll' })
	@ApiParam({ name: 'strollId' })
	@ApiOkResponse({ type: [StageResponseDto], description: 'Ordered stage list.' })
	@Get()
	list(@Param('strollId') strollId: string) {
		return this.stagesService.list(strollId);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Add a stage to a stroll' })
	@ApiParam({ name: 'strollId' })
	@ApiCreatedResponse({ type: StageResponseDto, description: 'Stage created successfully.' })
	@ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Validation failed.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'You are not allowed to modify stages in this stroll.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Stroll not found.' })
	@UseGuards(JwtAuthGuard)
	@Post()
	create(@Param('strollId') strollId: string, @Body() dto: CreateStageDto, @CurrentUser() user: AuthenticatedUser) {
		return this.stagesService.create(strollId, dto, user.userId);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Reorder stroll stages' })
	@ApiParam({ name: 'strollId' })
	@ApiOkResponse({ type: ReorderStagesResponseDto, description: 'Stages reordered successfully.' })
	@ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Validation failed.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'You are not allowed to modify stages in this stroll.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Stage or stroll not found.' })
	@UseGuards(JwtAuthGuard)
	@Patch('reorder')
	reorder(@Param('strollId') strollId: string, @Body() dto: ReorderStagesDto, @CurrentUser() user: AuthenticatedUser) {
		return this.stagesService.reorder(strollId, dto, user.userId);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Update a stage' })
	@ApiParam({ name: 'strollId' })
	@ApiParam({ name: 'stageId' })
	@ApiOkResponse({ type: StageResponseDto, description: 'Stage updated successfully.' })
	@ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Validation failed.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'You are not allowed to modify stages in this stroll.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Stage or stroll not found.' })
	@UseGuards(JwtAuthGuard)
	@Patch(':stageId')
	update(
		@Param('strollId') strollId: string,
		@Param('stageId') stageId: string,
		@Body() dto: UpdateStageDto,
		@CurrentUser() user: AuthenticatedUser
	) {
		return this.stagesService.update(strollId, stageId, dto, user.userId);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Delete a stage' })
	@ApiParam({ name: 'strollId' })
	@ApiParam({ name: 'stageId' })
	@ApiOkResponse({ description: 'Stage deleted successfully.', schema: { example: { id: '53fd478b-8cc2-4d1c-91ca-9f69ea9d5037', deleted: true } } })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'You are not allowed to modify stages in this stroll.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Stage or stroll not found.' })
	@UseGuards(JwtAuthGuard)
	@Delete(':stageId')
	remove(@Param('strollId') strollId: string, @Param('stageId') stageId: string, @CurrentUser() user: AuthenticatedUser) {
		return this.stagesService.remove(strollId, stageId, user.userId);
	}
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AdventureDetailResponseDto } from './dto/adventure-detail-response.dto';
import { AdventureResponseDto } from './dto/adventure-response.dto';
import { SubmitStageAnswerResponseDto } from './dto/submit-stage-answer-response.dto';
import { SubmitStageAnswerDto } from './dto/submit-stage-answer.dto';
import { UnlockStrollDto } from './dto/unlock-stroll.dto';
import { AdventuresService } from './adventures.service';

@ApiTags('Adventures')
@Controller('adventures')
export class AdventuresController {
  constructor(private readonly adventuresService: AdventuresService) {}

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Unlock a stroll as an adventure' })
  @ApiCreatedResponse({ type: AdventureResponseDto, description: 'Adventure unlocked successfully.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Stroll not found.' })
  @UseGuards(JwtAuthGuard)
  @Post('unlock')
  unlock(@Body() dto: UnlockStrollDto, @CurrentUser() user: AuthenticatedUser) {
    return this.adventuresService.unlock(dto, user.userId);
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
    return this.adventuresService.start(adventureId, user.userId);
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
    return this.adventuresService.get(adventureId, user.userId);
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adventuresService.submitAnswer(adventureId, stageId, dto, user.userId);
  }
}

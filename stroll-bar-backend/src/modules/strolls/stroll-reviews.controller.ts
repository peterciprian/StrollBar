import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { CreateStrollReviewDto } from './dto/create-stroll-review.dto';
import { StrollReviewListResponseDto, StrollReviewResponseDto } from './dto/stroll-review-response.dto';
import { StrollReviewsService } from './stroll-reviews.service';

@ApiTags('Strolls')
@ApiParam({ name: 'strollId' })
@Controller('strolls/:strollId/reviews')
export class StrollReviewsController {
	constructor(private readonly reviewsService: StrollReviewsService) {}

	@ApiOperation({ summary: 'List the reviews of a stroll, most recent first' })
	@ApiOkResponse({ type: StrollReviewListResponseDto })
	@Get()
	list(@Param('strollId') strollId: string) {
		return this.reviewsService.list(strollId);
	}

	@ApiOperation({ summary: 'Get the review the current user left for a stroll' })
	@ApiOkResponse({ type: StrollReviewResponseDto, description: 'Null when the user has not reviewed the stroll yet.' })
	@ApiBearerAuth('bearer')
	@UseGuards(JwtAuthGuard)
	@Get('mine')
	findMine(@Param('strollId') strollId: string, @CurrentUser() user: AuthenticatedUser) {
		return this.reviewsService.findMine(strollId, user.userId);
	}

	@ApiOperation({ summary: 'Submit or update the review of a completed stroll' })
	@ApiCreatedResponse({ type: StrollReviewResponseDto })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'The stroll was not completed by the current user.' })
	@ApiBearerAuth('bearer')
	@UseGuards(JwtAuthGuard)
	@Post()
	submit(@Param('strollId') strollId: string, @Body() dto: CreateStrollReviewDto, @CurrentUser() user: AuthenticatedUser) {
		return this.reviewsService.submit(strollId, user.userId, dto);
	}
}

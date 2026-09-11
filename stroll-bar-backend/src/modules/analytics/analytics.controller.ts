import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AnalyticsSummaryResponseDto } from './dto/analytics-summary-response.dto';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
	constructor(private readonly analyticsService: AnalyticsService) {}

	@ApiOperation({ summary: "Get the current user's analytics summary" })
	@ApiOkResponse({ type: AnalyticsSummaryResponseDto })
	@Get('summary')
	getSummary(@CurrentUser() user: AuthenticatedUser) {
		return this.analyticsService.getSummary(user.userId);
	}
}

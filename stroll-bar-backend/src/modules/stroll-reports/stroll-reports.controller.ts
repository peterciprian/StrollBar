import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { CreateStrollReportDto } from './dto/create-stroll-report.dto';
import { StrollReportResponseDto } from './dto/stroll-report-response.dto';
import { StrollReportsService } from './stroll-reports.service';

@ApiTags('Stroll Reports')
@Controller()
export class StrollReportsController {
	constructor(private readonly strollReportsService: StrollReportsService) {}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Report a stroll for inappropriate or harmful content' })
	@ApiCreatedResponse({ type: StrollReportResponseDto, description: 'Report submitted successfully.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Stroll not found.' })
	@UseGuards(JwtAuthGuard)
	@Post('strolls/:strollId/reports')
	create(@Param('strollId') strollId: string, @Body() dto: CreateStrollReportDto, @CurrentUser() user: AuthenticatedUser) {
		return this.strollReportsService.create(strollId, dto, user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'List every stroll report with stroll and author details (admin only)' })
	@ApiOkResponse({ description: 'All reports, most recent first.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Administrator access required.' })
	@UseGuards(JwtAuthGuard)
	@Get('stroll-reports')
	listAll(@CurrentUser() user: AuthenticatedUser) {
		return this.strollReportsService.listAllForAdmin(user);
	}
}

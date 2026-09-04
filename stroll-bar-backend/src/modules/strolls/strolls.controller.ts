import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
	ApiBadRequestResponse,
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiTags
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateStrollDto } from './dto/create-stroll.dto';
import { BulkImportStrollDto } from './dto/bulk-import-stroll.dto';
import { ListStrollsQueryDto, STROLL_SORT_OPTIONS } from './dto/list-strolls-query.dto';
import { StrollDetailResponseDto } from './dto/stroll-detail-response.dto';
import { StrollListResponseDto } from './dto/stroll-list-response.dto';
import { StrollResponseDto } from './dto/stroll-response.dto';
import { UpdateStrollDto } from './dto/update-stroll.dto';
import { StrollsService } from './strolls.service';
import { BrowseStrollsResponseDto } from './dto/browse-strolls-response.dto';

@ApiTags('Strolls')
@Controller('strolls')
export class StrollsController {
	constructor(private readonly strollsService: StrollsService) {}

	@ApiOperation({ summary: 'Browse published public and private stroll summaries' })
	@ApiQuery({ name: 'search', required: false })
	@ApiQuery({ name: 'labels', required: false })
	@ApiQuery({ name: 'authorId', required: false })
	@ApiQuery({ name: 'city', required: false })
	@ApiQuery({ name: 'sortBy', required: false, enum: STROLL_SORT_OPTIONS })
	@ApiQuery({ name: 'userLatitude', required: false, type: Number })
	@ApiQuery({ name: 'userLongitude', required: false, type: Number })
	@ApiQuery({ name: 'page', required: false, type: Number })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiOkResponse({ type: BrowseStrollsResponseDto, description: 'Paginated product-preview summaries.' })
	@UseGuards(OptionalJwtAuthGuard)
	@Get()
	list(@Query() query: ListStrollsQueryDto, @CurrentUser() user?: AuthenticatedUser) {
		return this.strollsService.list(query);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'List strolls owned by the authenticated user' })
	@ApiOkResponse({
		type: StrollListResponseDto,
		description: 'Paginated owner stroll list, including drafts and private strolls.'
	})
	@UseGuards(JwtAuthGuard)
	@Get('mine')
	listOwned(@Query() query: ListStrollsQueryDto, @CurrentUser() user: AuthenticatedUser) {
		return this.strollsService.listOwned(query, user.userId);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Get an owned stroll with its ordered stages' })
	@ApiParam({ name: 'strollId' })
	@ApiOkResponse({ type: StrollDetailResponseDto, description: 'Owned stroll details for any status.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'The stroll belongs to another user.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Stroll not found.' })
	@UseGuards(JwtAuthGuard)
	@Get('mine/:strollId')
	findOwnedOne(@Param('strollId') strollId: string, @CurrentUser() user: AuthenticatedUser) {
		return this.strollsService.findOwnedOne(strollId, user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Create a stroll' })
	@ApiCreatedResponse({ type: StrollResponseDto, description: 'Stroll created successfully.' })
	@ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Validation failed.' })
	@UseGuards(JwtAuthGuard)
	@Post()
	create(@Body() dto: CreateStrollDto, @CurrentUser() user: AuthenticatedUser) {
		return this.strollsService.create(dto, user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Bulk import a stroll and its stages (admin only)' })
	@ApiCreatedResponse({ type: StrollDetailResponseDto, description: 'Stroll and stages imported successfully.' })
	@ApiBadRequestResponse({ type: ErrorResponseDto, description: 'The bulk payload failed validation.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Only administrators can bulk import strolls.' })
	@UseGuards(JwtAuthGuard)
	@Post('bulk-import')
	bulkImport(@Body() dto: BulkImportStrollDto, @CurrentUser() user: AuthenticatedUser) {
		return this.strollsService.bulkImport(dto, user);
	}

	@ApiOperation({ summary: 'Get a stroll with its ordered stages' })
	@ApiParam({ name: 'strollId' })
	@ApiOkResponse({ type: StrollDetailResponseDto, description: 'Stroll details with ordered stages.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Stroll not found.' })
	@UseGuards(OptionalJwtAuthGuard)
	@Get(':strollId')
	findOne(@Param('strollId') strollId: string, @CurrentUser() user?: AuthenticatedUser) {
		return this.strollsService.findOne(strollId, user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Update a stroll' })
	@ApiParam({ name: 'strollId' })
	@ApiOkResponse({ type: StrollResponseDto, description: 'Stroll updated successfully.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'You are not allowed to modify this stroll.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Stroll not found.' })
	@UseGuards(JwtAuthGuard)
	@Patch(':strollId')
	update(@Param('strollId') strollId: string, @Body() dto: UpdateStrollDto, @CurrentUser() user: AuthenticatedUser) {
		return this.strollsService.update(strollId, dto, user);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Delete a stroll' })
	@ApiParam({ name: 'strollId' })
	@ApiOkResponse({
		description: 'Stroll deleted successfully.',
		schema: { example: { id: '0e86308f-78cd-4929-a7d8-9db9c3307ee6', deleted: true } }
	})
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'You are not allowed to modify this stroll.' })
	@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Stroll not found.' })
	@UseGuards(JwtAuthGuard)
	@Delete(':strollId')
	remove(@Param('strollId') strollId: string, @CurrentUser() user: AuthenticatedUser) {
		return this.strollsService.remove(strollId, user);
	}
}

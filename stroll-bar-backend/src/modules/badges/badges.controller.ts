import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { BadgeCatalogEntryDto } from './dto/badge-catalog-entry.dto';
import { CreateBadgeDefinitionDto } from './dto/create-badge-definition.dto';
import { UpdateBadgeDefinitionDto } from './dto/update-badge-definition.dto';
import { BadgesService } from './badges.service';

@ApiTags('Badges')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('badges')
export class BadgesController {
	constructor(private readonly badgesService: BadgesService) {}

	@ApiOperation({ summary: "Get the full badge catalog with the current user's earned status" })
	@ApiOkResponse({ type: BadgeCatalogEntryDto, isArray: true })
	@Get()
	getCatalog(@CurrentUser() user: AuthenticatedUser) {
		return this.badgesService.getCatalogForUser(user.userId);
	}

	@ApiOperation({ summary: 'List every badge definition, including inactive ones (admin only)' })
	@ApiOkResponse({ description: 'All badge definitions.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Administrator access required.' })
	@Get('admin/definitions')
	listDefinitions(@CurrentUser() user: AuthenticatedUser) {
		return this.badgesService.listDefinitionsForAdmin(user);
	}

	@ApiOperation({ summary: 'Create a new badge definition (admin only)' })
	@ApiOkResponse({ description: 'Badge definition created successfully.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Administrator access required, or the code is already in use.' })
	@Post('admin/definitions')
	createDefinition(@Body() dto: CreateBadgeDefinitionDto, @CurrentUser() user: AuthenticatedUser) {
		return this.badgesService.createDefinition(dto, user);
	}

	@ApiOperation({ summary: 'Update a badge definition (admin only)' })
	@ApiParam({ name: 'id' })
	@ApiOkResponse({ description: 'Badge definition updated successfully.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Administrator access required.' })
	@Patch('admin/definitions/:id')
	updateDefinition(@Param('id') id: string, @Body() dto: UpdateBadgeDefinitionDto, @CurrentUser() user: AuthenticatedUser) {
		return this.badgesService.updateDefinition(id, dto, user);
	}

	@ApiOperation({ summary: 'Delete a badge definition and any badges users earned from it (admin only)' })
	@ApiParam({ name: 'id' })
	@ApiOkResponse({ description: 'Badge definition deleted successfully.' })
	@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Administrator access required.' })
	@Delete('admin/definitions/:id')
	deleteDefinition(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
		return this.badgesService.deleteDefinition(id, user);
	}
}

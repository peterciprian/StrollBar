import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { BadgeCatalogEntryDto } from './dto/badge-catalog-entry.dto';
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
}

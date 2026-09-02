import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../modules/auth/interfaces/authenticated-user.interface';
import { UserRole } from '../modules/users/entities/user.entity';
import { AuditAction } from './audit.entity';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth('bearer')
@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
	constructor(private readonly auditService: AuditService) {}

	@ApiOperation({ summary: 'Query security audit events (admin only)' })
	@ApiOkResponse({ description: 'Matching audit events.' })
	@Get('events')
	list(@CurrentUser() user: AuthenticatedUser, @Query('action') action?: AuditAction, @Query('limit') limit?: string) {
		if (user.role !== UserRole.ADMIN) {
			return this.auditService.forbidden();
		}
		return this.auditService.list({ action, limit: Number(limit ?? 100) });
	}
}

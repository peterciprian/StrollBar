import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from './audit.service';

@Injectable()
export class AuditRetentionService implements OnModuleInit, OnModuleDestroy {
	private timer?: NodeJS.Timeout;

	constructor(
		private readonly auditService: AuditService,
		private readonly configService: ConfigService
	) {}

	onModuleInit(): void {
		const retentionDays = Number(this.configService.get<string>('AUDIT_RETENTION_DAYS') ?? '365');
		const intervalMs = Number(this.configService.get<string>('AUDIT_RETENTION_INTERVAL_MS') ?? '86400000');
		this.timer = setInterval(() => void this.auditService.purgeExpired(retentionDays), intervalMs);
		this.timer.unref();
		void this.auditService.purgeExpired(retentionDays);
	}

	onModuleDestroy(): void {
		if (this.timer) clearInterval(this.timer);
	}
}

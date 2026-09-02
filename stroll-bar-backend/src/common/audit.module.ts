import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEventEntity } from './audit.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditRetentionService } from './audit-retention.service';

@Global()
@Module({
	imports: [TypeOrmModule.forFeature([AuditEventEntity])],
	providers: [AuditService, AuditRetentionService],
	controllers: [AuditController],
	exports: [AuditService]
})
export class AuditModule {}

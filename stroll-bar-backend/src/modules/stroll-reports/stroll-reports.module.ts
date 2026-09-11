import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StrollReportsController } from './stroll-reports.controller';
import { StrollReportsService } from './stroll-reports.service';
import { StrollReportEntity } from './entities/stroll-report.entity';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { UserEntity } from '../users/entities/user.entity';

@Module({
	imports: [TypeOrmModule.forFeature([StrollReportEntity, StrollEntity, UserEntity])],
	controllers: [StrollReportsController],
	providers: [StrollReportsService],
	exports: [StrollReportsService]
})
export class StrollReportsModule {}

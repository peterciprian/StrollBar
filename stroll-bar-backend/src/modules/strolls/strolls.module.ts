import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StrollsController } from './strolls.controller';
import { StrollsService } from './strolls.service';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollEntity } from './entities/stroll.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AdventureEntity } from '../adventures/entities/adventure.entity';
import { RedisCacheService } from '../../common/services/redis-cache.service';

@Module({
	imports: [TypeOrmModule.forFeature([StrollEntity, StageEntity, UserEntity, AdventureEntity])],
	controllers: [StrollsController],
	providers: [StrollsService, RedisCacheService],
	exports: [StrollsService]
})
export class StrollsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StagesController } from './stages.controller';
import { StagesService } from './stages.service';
import { StageEntity } from './entities/stage.entity';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { AdventureEntity } from '../adventures/entities/adventure.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
	imports: [TypeOrmModule.forFeature([StageEntity, StrollEntity, AdventureEntity, UserEntity]), AuthModule],
	controllers: [StagesController],
	providers: [StagesService],
	exports: [StagesService]
})
export class StagesModule {}

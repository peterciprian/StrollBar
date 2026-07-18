import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { UserEntity } from '../users/entities/user.entity';
import { MediaController } from './media.controller';
import { MediaAssetEntity } from './entities/media-asset.entity';
import { MediaService } from './media.service';

@Module({
  imports: [ConfigModule, AuthModule, TypeOrmModule.forFeature([MediaAssetEntity, StrollEntity, StageEntity, UserEntity])],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaidGrantEntity } from './entities/paid-grant.entity';
import { EffectiveRoleService } from './effective-role.service';

@Module({
	imports: [TypeOrmModule.forFeature([PaidGrantEntity])],
	providers: [EffectiveRoleService],
	exports: [EffectiveRoleService]
})
export class EffectiveRoleModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AdventureEntity } from '../adventures/entities/adventure.entity';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { UserEntity } from './entities/user.entity';
import { RoleAssignmentsService } from './role-assignments.service';
import { EffectiveRoleModule } from './effective-role.module';
import { PaidGrantEntity } from './entities/paid-grant.entity';
import { UserEntitlementService } from './user-entitlement.service';
import { RoleLifecycleOutboxEntity } from './entities/role-lifecycle-outbox.entity';

@Module({
  imports: [EffectiveRoleModule, TypeOrmModule.forFeature([UserEntity, PaidGrantEntity, RoleLifecycleOutboxEntity, StrollEntity, AdventureEntity])],
  controllers: [UsersController],
  providers: [UsersService, RoleAssignmentsService, UserEntitlementService],
  exports: [UsersService],
})
export class UsersModule {}

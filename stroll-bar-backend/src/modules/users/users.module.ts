import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AdventureEntity } from '../adventures/entities/adventure.entity';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { UserEntity } from './entities/user.entity';
import { RoleAssignmentsService } from './role-assignments.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, StrollEntity, AdventureEntity])],
  controllers: [UsersController],
  providers: [UsersService, RoleAssignmentsService],
  exports: [UsersService],
})
export class UsersModule {}

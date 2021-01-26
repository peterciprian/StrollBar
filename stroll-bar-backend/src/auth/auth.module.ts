import * as passport from 'passport';
import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from 'src/users/users.module';
import { AchievementsModule } from 'src/achievements/achievements.module';
import { StagesModule } from 'src/stages/stages.module';
import { StrollsModule } from 'src/strolls/strolls.module';
import { UsersController } from 'src/users/users.controller';
import { AchievementsController } from 'src/achievements/achievements.controller';
import { StagesController } from 'src/stages/stages.controller';
import { StrollsController } from 'src/strolls/strolls.controller';

@Module({
  imports: [UsersModule, AchievementsModule, StagesModule, StrollsModule],
  providers: [AuthService, JwtStrategy],
  controllers: [
    AuthController,
    UsersController,
    AchievementsController,
    StagesController,
    StrollsController,
  ],
})
export class AuthModule { }

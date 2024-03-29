import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { StrollsModule } from './strolls/strolls.module';
import { StagesModule } from './stages/stages.module';
import { AchievementsModule } from './achievements/achievements.module';
import { UsersModule } from './users/users.module';
import { FacebookStrategy } from './auth/strategies/facebook.strategy';
import { GoogleStrategy } from './auth/strategies/google.strategy';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb+srv://cluster0.iijhz.mongodb.net', {
      user: 'admin',
      pass: 'admin',
      dbName: 'StrollBar',
      w: 'majority',
      retryWrites: true,
    }),
    StrollsModule,
    StagesModule,
    AchievementsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, FacebookStrategy, GoogleStrategy],
})
export class AppModule {}

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

const socialAuthProviders = [] as Array<typeof FacebookStrategy | typeof GoogleStrategy>;

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_SECRET) {
  socialAuthProviders.push(FacebookStrategy);
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_SECRET) {
  socialAuthProviders.push(GoogleStrategy);
}

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/StrollBar',
    ),
    StrollsModule,
    StagesModule,
    AchievementsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, ...socialAuthProviders],
})
export class AppModule {}

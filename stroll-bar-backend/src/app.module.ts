import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StrollsModule } from './modules/strolls/strolls.module';
import { StagesModule } from './modules/stages/stages.module';
import { AdventuresModule } from './modules/adventures/adventures.module';
import { MediaModule } from './modules/media/media.module';
import { buildDatabaseOptions } from './database/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? 'development'}`,
        '.env',
      ],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 20,
      },
    ]),
    TypeOrmModule.forRootAsync({
      useFactory: () => buildDatabaseOptions(),
    }),
    AuthModule,
    UsersModule,
    StrollsModule,
    StagesModule,
    AdventuresModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

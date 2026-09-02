import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StrollsModule } from './modules/strolls/strolls.module';
import { StagesModule } from './modules/stages/stages.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { AdventuresModule } from './modules/adventures/adventures.module';
import { MediaModule } from './modules/media/media.module';
import { EmailModule } from './modules/email/email.module';
import { buildDatabaseOptions } from './database/database.config';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env']
		}),
		ThrottlerModule.forRoot([
			{
				ttl: 60_000,
				limit: Number(process.env.API_RATE_LIMIT ?? '100')
			}
		]),
		TypeOrmModule.forRootAsync({
			useFactory: () => buildDatabaseOptions()
		}),
		AuthModule,
		UsersModule,
		StrollsModule,
		StagesModule,
		AchievementsModule,
		AdventuresModule,
		MediaModule,
		EmailModule
	],
	controllers: [AppController],
	providers: [
		AppService,
		{
			provide: APP_GUARD,
			useClass: AppThrottlerGuard
		}
	]
})
export class AppModule {
	configure(consumer: MiddlewareConsumer): void {
		consumer.apply(RequestLoggingMiddleware).forRoutes('*');
	}
}

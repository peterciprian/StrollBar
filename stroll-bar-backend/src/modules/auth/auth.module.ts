import type { StringValue } from 'ms';
import { ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SocialIdentityEntity } from './entities/social-identity.entity';
import { UserEntity } from '../users/entities/user.entity';
import { EmailModule } from '../email/email.module';
import { OAuthProviderService } from './services/oauth-provider.service';
import { SocialUserService } from './services/social-user.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([UserEntity, SocialIdentityEntity]),
		EmailModule,
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule.registerAsync({
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get<string>('JWT_SECRET') ?? 'strollbar-dev-secret',
				signOptions: {
					expiresIn: (configService.get<string>('JWT_ACCESS_TOKEN_TTL') ?? '1h') as StringValue
				}
			})
		})
	],
	controllers: [AuthController],
	providers: [AuthService, OAuthProviderService, SocialUserService, JwtStrategy, JwtAuthGuard, OptionalJwtAuthGuard],
	exports: [AuthService, JwtAuthGuard, OptionalJwtAuthGuard, PassportModule, JwtModule]
})
export class AuthModule {}

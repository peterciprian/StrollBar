import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { UserRole } from '../../users/entities/user.entity';

interface JwtPayload {
	sub: string;
	email: string;
	username: string;
	role?: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(configService: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: configService.getOrThrow<string>('JWT_SECRET')
		});
	}

	validate(payload: JwtPayload): AuthenticatedUser {
		if (!payload.sub) {
			throw new UnauthorizedException('Invalid JWT payload.');
		}

		return {
			userId: payload.sub,
			email: payload.email,
			username: payload.username,
			role: payload.role ?? UserRole.SIMPLE
		};
	}
}

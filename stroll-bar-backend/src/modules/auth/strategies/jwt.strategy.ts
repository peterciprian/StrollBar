import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { UserEntity, UserRole } from '../../users/entities/user.entity';

interface JwtPayload {
	sub: string;
	email: string;
	username: string;
	role?: UserRole;
	authVersion?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(configService: ConfigService, @InjectRepository(UserEntity) private readonly usersRepository: Repository<UserEntity>) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: configService.getOrThrow<string>('JWT_SECRET')
		});
	}

	async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
		if (!payload.sub) {
			throw new UnauthorizedException('Invalid JWT payload.');
		}

		const user = await this.usersRepository.findOne({ where: { id: payload.sub, isActive: true } });
		if (!user || (payload.authVersion ?? 0) !== user.authVersion) {
			throw new UnauthorizedException('This session is no longer valid. Please log in again.');
		}

		return {
			userId: payload.sub,
			email: user.email,
			username: user.username,
			role: user.role
		};
	}
}

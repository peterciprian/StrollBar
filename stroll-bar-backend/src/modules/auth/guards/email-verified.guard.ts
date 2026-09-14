import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { AppErrorCode } from '../../../common/utils/app-error-code';

/** Must be listed after JwtAuthGuard in @UseGuards so request.user is populated. */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
	constructor(
		@InjectRepository(UserEntity)
		private readonly usersRepository: Repository<UserEntity>
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
		const userId = request.user?.userId;
		if (!userId) {
			throw new UnauthorizedException('Authentication is required.');
		}

		// Read live instead of trusting the token, so verifying takes effect without re-login.
		const user = await this.usersRepository.findOne({ where: { id: userId }, select: { id: true, emailVerified: true } });
		if (!user?.emailVerified) {
			throw new ForbiddenException({
				code: AppErrorCode.EMAIL_NOT_VERIFIED,
				message: 'Verify your email address before creating or modifying content.'
			});
		}

		return true;
	}
}

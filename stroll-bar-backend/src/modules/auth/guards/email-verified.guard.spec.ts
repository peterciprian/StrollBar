import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AppErrorCode } from '../../../common/utils/app-error-code';
import { EmailVerifiedGuard } from './email-verified.guard';

describe('EmailVerifiedGuard', () => {
	let usersRepository: { findOne: jest.Mock };
	let guard: EmailVerifiedGuard;

	beforeEach(() => {
		usersRepository = { findOne: jest.fn() };
		guard = new EmailVerifiedGuard(usersRepository as never);
	});

	it('rejects requests without an authenticated user', async () => {
		await expect(guard.canActivate(buildContext({}))).rejects.toThrow(UnauthorizedException);
		expect(usersRepository.findOne).not.toHaveBeenCalled();
	});

	it('reads the live email verification state from the database', async () => {
		usersRepository.findOne.mockResolvedValue({ id: 'user-1', emailVerified: true });

		await expect(guard.canActivate(buildContext({ user: { userId: 'user-1' } }))).resolves.toBe(true);
		expect(usersRepository.findOne).toHaveBeenCalledWith({
			where: { id: 'user-1' },
			select: { id: true, emailVerified: true }
		});
	});

	it('rejects unverified users with a stable machine-readable error code', async () => {
		usersRepository.findOne.mockResolvedValue({ id: 'user-1', emailVerified: false });

		await expect(guard.canActivate(buildContext({ user: { userId: 'user-1' } }))).rejects.toMatchObject({
			response: {
				code: AppErrorCode.EMAIL_NOT_VERIFIED,
				message: 'Verify your email address before creating or modifying content.'
			}
		});
	});

	it('rejects deleted or missing users as unverified', async () => {
		usersRepository.findOne.mockResolvedValue(null);

		await expect(guard.canActivate(buildContext({ user: { userId: 'missing-user' } }))).rejects.toThrow(ForbiddenException);
	});
});

function buildContext(request: Record<string, unknown>): ExecutionContext {
	return {
		switchToHttp: () => ({
			getRequest: () => request
		})
	} as ExecutionContext;
}

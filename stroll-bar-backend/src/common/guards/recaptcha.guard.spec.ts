import { BadRequestException, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { RecaptchaGuard } from './recaptcha.guard';

describe('RecaptchaGuard', () => {
	let reflector: { getAllAndOverride: jest.Mock };
	let recaptchaService: { isEnabled: jest.Mock; verify: jest.Mock; getMinimumScore: jest.Mock };
	let warnSpy: jest.SpyInstance;
	let guard: RecaptchaGuard;

	beforeEach(() => {
		reflector = { getAllAndOverride: jest.fn() };
		recaptchaService = {
			isEnabled: jest.fn(),
			verify: jest.fn(),
			getMinimumScore: jest.fn(() => 0.5)
		};
		warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
		guard = new RecaptchaGuard(reflector as never, recaptchaService as never);
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('allows routes without recaptcha metadata', async () => {
		reflector.getAllAndOverride.mockReturnValue(undefined);

		await expect(guard.canActivate(buildContext({ body: {} }))).resolves.toBe(true);
		expect(recaptchaService.verify).not.toHaveBeenCalled();
	});

	it('allows protected routes while recaptcha is disabled', async () => {
		reflector.getAllAndOverride.mockReturnValue('register');
		recaptchaService.isEnabled.mockReturnValue(false);

		await expect(guard.canActivate(buildContext({ body: {} }))).resolves.toBe(true);
		expect(recaptchaService.verify).not.toHaveBeenCalled();
	});

	it('requires a non-empty captcha token when enabled', async () => {
		reflector.getAllAndOverride.mockReturnValue('register');
		recaptchaService.isEnabled.mockReturnValue(true);

		await expect(guard.canActivate(buildContext({ body: { recaptchaToken: '   ' } }))).rejects.toThrow(BadRequestException);
		expect(recaptchaService.verify).not.toHaveBeenCalled();
	});

	it('allows matching successful captcha results above the minimum score', async () => {
		reflector.getAllAndOverride.mockReturnValue('register');
		recaptchaService.isEnabled.mockReturnValue(true);
		recaptchaService.getMinimumScore.mockReturnValue(0.7);
		recaptchaService.verify.mockResolvedValue({ success: true, score: 0.9, action: 'register', errorCodes: [] });

		await expect(guard.canActivate(buildContext({ body: { recaptchaToken: ' token ' }, ip: '127.0.0.1' }))).resolves.toBe(true);
		expect(recaptchaService.verify).toHaveBeenCalledWith('token', '127.0.0.1');
	});

	it('rejects failed, low-score, or action-mismatched captcha results', async () => {
		reflector.getAllAndOverride.mockReturnValue('register');
		recaptchaService.isEnabled.mockReturnValue(true);
		recaptchaService.getMinimumScore.mockReturnValue(0.7);
		recaptchaService.verify.mockResolvedValue({ success: true, score: 0.3, action: 'login', errorCodes: ['score-too-low'] });

		await expect(guard.canActivate(buildContext({ body: { recaptchaToken: 'token' } }))).rejects.toThrow(ForbiddenException);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('reCAPTCHA rejected for action "register"'));
	});
});

function buildContext(request: Record<string, unknown>): ExecutionContext {
	return {
		getHandler: () => function handler() {},
		getClass: () => class Controller {},
		switchToHttp: () => ({
			getRequest: () => request
		})
	} as unknown as ExecutionContext;
}

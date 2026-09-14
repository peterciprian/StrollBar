import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RecaptchaService } from '../services/recaptcha.service';

export const RECAPTCHA_ACTION_KEY = 'recaptcha:action';

/** Marks a route as reCAPTCHA v3 protected and declares the action the client token must match. */
export const RecaptchaAction = (action: string) => SetMetadata(RECAPTCHA_ACTION_KEY, action);

@Injectable()
export class RecaptchaGuard implements CanActivate {
	private readonly logger = new Logger(RecaptchaGuard.name);

	constructor(
		private readonly reflector: Reflector,
		private readonly recaptchaService: RecaptchaService
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const expectedAction = this.reflector.getAllAndOverride<string | undefined>(RECAPTCHA_ACTION_KEY, [context.getHandler(), context.getClass()]);
		if (!expectedAction || !this.recaptchaService.isEnabled()) {
			return true;
		}

		const request = context.switchToHttp().getRequest<Request>();
		const body = (request.body ?? {}) as Record<string, unknown>;
		const token = typeof body.recaptchaToken === 'string' ? body.recaptchaToken.trim() : '';
		if (!token) {
			throw new BadRequestException('Captcha verification is required.');
		}

		const result = await this.recaptchaService.verify(token, request.ip);
		const minimumScore = this.recaptchaService.getMinimumScore();
		const scoreOk = result.score === undefined || result.score >= minimumScore;
		const actionOk = result.action === undefined || result.action === expectedAction;

		if (!result.success || !scoreOk || !actionOk) {
			this.logger.warn(
				`reCAPTCHA rejected for action "${expectedAction}" (success=${result.success}, score=${result.score ?? 'n/a'}, action=${result.action ?? 'n/a'}, errors=${result.errorCodes.join(',') || 'none'})`
			);
			throw new ForbiddenException('Captcha verification failed.');
		}

		return true;
	}
}

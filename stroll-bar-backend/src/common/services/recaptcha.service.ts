import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

interface SiteVerifyResponse {
	success: boolean;
	score?: number;
	action?: string;
	challenge_ts?: string;
	hostname?: string;
	'error-codes'?: string[];
}

export interface RecaptchaVerificationResult {
	success: boolean;
	score?: number;
	action?: string;
	errorCodes: string[];
}

@Injectable()
export class RecaptchaService {
	private readonly logger = new Logger(RecaptchaService.name);
	private readonly timeoutMs: number;

	constructor(private readonly configService: ConfigService) {
		this.timeoutMs = Number(this.configService.get<string>('RECAPTCHA_TIMEOUT_MS') ?? '5000');
	}

	isEnabled(): boolean {
		return (this.configService.get<string>('RECAPTCHA_ENABLED') ?? 'false').toLowerCase() === 'true';
	}

	getMinimumScore(): number {
		const configured = Number(this.configService.get<string>('RECAPTCHA_MIN_SCORE') ?? '0.5');
		return Number.isFinite(configured) ? configured : 0.5;
	}

	async verify(token: string, remoteIp?: string): Promise<RecaptchaVerificationResult> {
		const secret = this.configService.get<string>('RECAPTCHA_SECRET_KEY');
		if (!secret) {
			throw new ServiceUnavailableException('Captcha verification is not configured.');
		}

		const body = new URLSearchParams({ secret, response: token });
		if (remoteIp) {
			body.set('remoteip', remoteIp);
		}

		let payload: SiteVerifyResponse;
		try {
			const response = await fetch(VERIFY_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: body.toString(),
				signal: AbortSignal.timeout(this.timeoutMs)
			});
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			payload = (await response.json()) as SiteVerifyResponse;
		} catch (error) {
			this.logger.error(`reCAPTCHA verification request failed: ${(error as Error).message}`);
			throw new ServiceUnavailableException('Captcha verification is temporarily unavailable.');
		}

		return {
			success: payload.success === true,
			score: payload.score,
			action: payload.action,
			errorCodes: payload['error-codes'] ?? []
		};
	}
}

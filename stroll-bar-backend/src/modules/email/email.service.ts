import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';
import { withRetry, withTimeoutAndRetry } from '../../common/utils/retry.util';

@Injectable()
export class EmailService {
	private brevoClient?: BrevoClient;
	private deliveryAttempts = 0;
	private deliverySuccesses = 0;
	private deliveryFailures = 0;

	constructor(private readonly configService: ConfigService) {}

	isDeliveryEnabled(): boolean {
		return (this.configService.get<string>('EMAIL_DELIVERY_ENABLED') ?? 'false').toLowerCase() === 'true';
	}

	async checkDeliveryConnectivity(): Promise<{ status: 'up' | 'down'; provider: string; detail: string }> {
		if (!this.isDeliveryEnabled()) {
			return { status: 'up', provider: 'brevo', detail: 'Email delivery is disabled.' };
		}

		try {
			await withTimeoutAndRetry(() => this.getBrevoClient().account.getAccount(), 10_000, {
				maxAttempts: 3,
				initialDelayMs: 1000,
				maxDelayMs: 10000,
				backoffMultiplier: 4,
				jitterFactor: 0
			});
			return {
				status: 'up',
				provider: 'brevo',
				detail: `Brevo API is reachable. Delivery attempts: ${this.deliveryAttempts}; successes: ${this.deliverySuccesses}; failures: ${this.deliveryFailures}.`
			};
		} catch (error) {
			return {
				status: 'down',
				provider: 'brevo',
				detail: error instanceof Error ? error.message : 'Brevo API connectivity failed.'
			};
		}
	}

	async sendVerificationEmail(recipient: string, username: string, token: string): Promise<void> {
		if (!this.isDeliveryEnabled()) {
			return;
		}
		this.validateEmailParameters(recipient, username, token);

		const verificationUrl = this.buildVerificationUrl(token);
		const safeUsername = this.escapeHtml(username);
		const safeVerificationUrl = this.escapeHtml(verificationUrl);
		const sender = this.parseSender(this.getRequiredConfig('EMAIL_FROM'));

		try {
			await withRetry(
				() => {
					this.deliveryAttempts += 1;
					return this.getBrevoClient().transactionalEmails.sendTransacEmail({
						sender,
						to: [{ email: recipient }],
						subject: 'Verify your StrollBar email address',
						textContent: [
							`Hello ${username},`,
							'',
							'Confirm your email address to finish setting up your StrollBar account:',
							verificationUrl,
							'',
							'For your security, this link will expire. If you did not create this account, you can ignore this email.'
						].join('\n'),
						htmlContent: [
							`<p>Hello ${safeUsername},</p>`,
							'<p>Confirm your email address to finish setting up your StrollBar account.</p>',
							`<p><a href="${safeVerificationUrl}">Verify email address</a></p>`,
							'<p>For your security, this link will expire. If you did not create this account, you can ignore this email.</p>'
						].join('')
					});
				},
				{
					maxAttempts: 3,
					initialDelayMs: 1000,
					maxDelayMs: 10000,
					backoffMultiplier: 4,
					isRetryable: (error: any) =>
						error?.statusCode === 408 ||
						error?.statusCode === 429 ||
						(error?.statusCode >= 500 && error?.statusCode < 600) ||
						error?.code === 'ETIMEDOUT' ||
						error?.name === 'TypeError'
				}
			);
			this.deliverySuccesses += 1;
		} catch {
			this.deliveryFailures += 1;
			throw new ServiceUnavailableException('The verification email could not be delivered. Please try again.');
		}
	}

	private getBrevoClient(): BrevoClient {
		if (!this.brevoClient) {
			this.brevoClient = new BrevoClient({
				apiKey: this.getRequiredConfig('BREVO_API_KEY'),
				timeoutInSeconds: 10,
				maxRetries: 0
			});
		}

		return this.brevoClient;
	}

	private parseSender(value: string): { email: string; name?: string } {
		const match = value.match(/^\s*(.*?)\s*<([^<>\s]+@[^<>\s]+)>\s*$/);
		if (match) {
			return { name: match[1], email: match[2] };
		}

		return { email: value.trim() };
	}

	private buildVerificationUrl(token: string): string {
		const baseUrl = this.configService.get<string>('EMAIL_VERIFICATION_URL') ?? 'http://localhost:4200/#/auth/verify-email';
		let url: URL;
		try {
			url = new URL(baseUrl);
		} catch {
			throw new ServiceUnavailableException('EMAIL_VERIFICATION_URL is invalid.');
		}

		if (!['http:', 'https:'].includes(url.protocol)) {
			throw new ServiceUnavailableException('EMAIL_VERIFICATION_URL must use HTTP or HTTPS.');
		}

		if (url.hash) {
			const hashSeparator = url.hash.includes('?') ? '&' : '?';
			url.hash = `${url.hash}${hashSeparator}token=${encodeURIComponent(token)}`;
		} else {
			url.searchParams.set('token', token);
		}
		return url.toString();
	}

	private validateEmailParameters(recipient: string, username: string, token: string): void {
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || recipient.length > 254) {
			throw new BadRequestException('A valid recipient email address is required.');
		}
		if (!username.trim() || username.length > 50) {
			throw new BadRequestException('A valid username is required.');
		}
		if (!/^[a-f0-9]{64}$/i.test(token)) {
			throw new BadRequestException('The verification token has an invalid format.');
		}
	}

	private getRequiredConfig(key: string): string {
		const value = this.configService.get<string>(key);

		if (!value) {
			throw new ServiceUnavailableException(`${key} is not configured.`);
		}

		return value;
	}

	private escapeHtml(value: string): string {
		return value.replace(/[&<>"']/g, (character) => {
			const entities: Record<string, string> = {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;'
			};
			return entities[character];
		});
	}
}

import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { withRetry, withTimeoutAndRetry } from '../../common/utils/retry.util';

@Injectable()
export class EmailService {
	private transporter?: Transporter;

	constructor(private readonly configService: ConfigService) {}

	isDeliveryEnabled(): boolean {
		return (this.configService.get<string>('EMAIL_DELIVERY_ENABLED') ?? 'false').toLowerCase() === 'true';
	}

	async checkDeliveryConnectivity(): Promise<{ status: 'up' | 'down'; provider: string; detail: string }> {
		if (!this.isDeliveryEnabled()) {
			return { status: 'up', provider: 'smtp', detail: 'Email delivery is disabled.' };
		}

		try {
			await withTimeoutAndRetry(() => this.getTransporter().verify(), 10_000, {
				maxAttempts: 3,
				initialDelayMs: 1000,
				maxDelayMs: 10000,
				backoffMultiplier: 4,
				jitterFactor: 0
			});
			return { status: 'up', provider: 'smtp', detail: 'SMTP server is reachable.' };
		} catch (error) {
			return {
				status: 'down',
				provider: 'smtp',
				detail: error instanceof Error ? error.message : 'SMTP connectivity failed.'
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

		try {
			await withRetry(
				() =>
					this.getTransporter().sendMail({
						from: this.getRequiredConfig('SMTP_FROM'),
						to: recipient,
						subject: 'Verify your StrollBar email address',
						text: [
							`Hello ${username},`,
							'',
							'Confirm your email address to finish setting up your StrollBar account:',
							verificationUrl,
							'',
							'For your security, this link will expire. If you did not create this account, you can ignore this email.'
						].join('\n'),
						html: [
							`<p>Hello ${safeUsername},</p>`,
							'<p>Confirm your email address to finish setting up your StrollBar account.</p>',
							`<p><a href="${safeVerificationUrl}">Verify email address</a></p>`,
							'<p>For your security, this link will expire. If you did not create this account, you can ignore this email.</p>'
						].join('')
					}),
				{
					maxAttempts: 3,
					initialDelayMs: 1000,
					maxDelayMs: 10000,
					backoffMultiplier: 4,
					isRetryable: (error: any) =>
						['ECONNECTION', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ESOCKET', 'ETLS'].includes(error?.code) ||
						(error?.responseCode >= 500 && error?.responseCode < 600)
				}
			);
		} catch {
			throw new ServiceUnavailableException('The verification email could not be delivered. Please try again.');
		}
	}

	private getTransporter(): Transporter {
		if (!this.transporter) {
			const username = this.configService.get<string>('SMTP_USER');
			const password = this.configService.get<string>('SMTP_PASSWORD');

			if ((username && !password) || (!username && password)) {
				throw new ServiceUnavailableException('SMTP_USER and SMTP_PASSWORD must be configured together.');
			}

			this.transporter = createTransport({
				host: this.getRequiredConfig('SMTP_HOST'),
				port: Number(this.configService.get<string>('SMTP_PORT') ?? '587'),
				secure: (this.configService.get<string>('SMTP_SECURE') ?? 'false').toLowerCase() === 'true',
				auth: username && password ? { user: username, pass: password } : undefined
			});
		}

		return this.transporter;
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

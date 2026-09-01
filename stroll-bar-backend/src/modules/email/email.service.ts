import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
	private transporter?: Transporter;

	constructor(private readonly configService: ConfigService) {}

	isDeliveryEnabled(): boolean {
		return (this.configService.get<string>('EMAIL_DELIVERY_ENABLED') ?? 'false').toLowerCase() === 'true';
	}

	async sendVerificationEmail(recipient: string, username: string, token: string): Promise<void> {
		if (!this.isDeliveryEnabled()) {
			return;
		}

		const verificationUrl = this.buildVerificationUrl(token);
		const safeUsername = this.escapeHtml(username);
		const safeVerificationUrl = this.escapeHtml(verificationUrl);

		try {
			await this.getTransporter().sendMail({
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
			});
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
		return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
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

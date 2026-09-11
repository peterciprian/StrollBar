import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';
import { withRetry, withTimeoutAndRetry } from '../../common/utils/retry.util';
import { StrollActiveStatus } from '../strolls/entities/stroll.entity';

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
						subject: 'Verify your StrollBar email address \uD83D\uDC63',
						textContent: [
							`Hey ${username},`,
							'',
							'One quick step before you hit the pavement: confirm your email to activate your account.',
							verificationUrl,
							'',
							'This link expires soon, so dont dawdle. If you did not create this account, just ignore this email.'
						].join('\n'),
						htmlContent: this.wrapHtml(
							'Verify your email',
							[
								`<p style="margin:0 0 16px;">Hey ${safeUsername}! \uD83D\uDC4B</p>`,
								'<p style="margin:0 0 20px;">One quick step before you hit the pavement: confirm your email to activate your StrollBar account.</p>',
								this.button(safeVerificationUrl, 'Verify my email'),
								'<p style="margin:24px 0 0;color:#64748b;font-size:13px;">This link expires soon, so don\u2019t dawdle. Didn\u2019t create this account? Just ignore this email.</p>'
							].join('')
						)
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

	async sendStrollCreatedEmail(recipient: string, authorUsername: string, strollName: string): Promise<void> {
		if (!this.isDeliveryEnabled()) {
			return;
		}
		this.validateRecipientAndUsername(recipient, authorUsername);
		const safeUsername = this.escapeHtml(authorUsername);
		const safeStrollName = this.escapeHtml(strollName);
		const sender = this.parseSender(this.getRequiredConfig('EMAIL_FROM'));

		await this.deliver(
			() =>
				this.getBrevoClient().transactionalEmails.sendTransacEmail({
					sender,
					to: [{ email: recipient }],
					subject: `You created "${strollName}" \uD83C\uDF89`,
					textContent: [
						`Hey ${authorUsername},`,
						'',
						`"${strollName}" is officially born! Add some stages and polish it up whenever you're ready to publish.`
					].join('\n'),
					htmlContent: this.wrapHtml(
						'Stroll created',
						[
							`<p style="margin:0 0 16px;">Hey ${safeUsername}! \uD83D\uDC4B</p>`,
							`<p style="margin:0 0 20px;"><strong>\u201C${safeStrollName}\u201D</strong> is officially born! \uD83C\uDF89</p>`,
							'<p style="margin:0;">Add some stages, sprinkle in photos, and publish whenever you\u2019re ready to send people exploring.</p>'
						].join('')
					)
				}),
			'The stroll creation notification email could not be delivered.'
		);
	}

	async sendStrollStatusChangedEmail(recipient: string, authorUsername: string, strollName: string, newStatus: StrollActiveStatus): Promise<void> {
		if (!this.isDeliveryEnabled()) {
			return;
		}
		this.validateRecipientAndUsername(recipient, authorUsername);
		const safeUsername = this.escapeHtml(authorUsername);
		const safeStrollName = this.escapeHtml(strollName);
		const safeStatus = this.escapeHtml(newStatus);
		const statusCopy = this.describeStatusChange(newStatus);
		const sender = this.parseSender(this.getRequiredConfig('EMAIL_FROM'));

		await this.deliver(
			() =>
				this.getBrevoClient().transactionalEmails.sendTransacEmail({
					sender,
					to: [{ email: recipient }],
					subject: `Your stroll "${strollName}" is now ${newStatus} \uD83D\uDCE2`,
					textContent: [`Hey ${authorUsername},`, '', `Heads up: "${strollName}" just changed status to ${newStatus}. ${statusCopy}`].join(
						'\n'
					),
					htmlContent: this.wrapHtml(
						'Stroll status update',
						[
							`<p style="margin:0 0 16px;">Hey ${safeUsername}! \uD83D\uDC4B</p>`,
							`<p style="margin:0 0 20px;">Heads up \u2014 your stroll <strong>\u201C${safeStrollName}\u201D</strong> just changed status to ${this.statusBadge(safeStatus)}.</p>`,
							`<p style="margin:0;">${statusCopy}</p>`
						].join('')
					)
				}),
			'The stroll status notification email could not be delivered.'
		);
	}

	async sendStrollPurchasedEmail(recipient: string, authorUsername: string, strollName: string): Promise<void> {
		if (!this.isDeliveryEnabled()) {
			return;
		}
		this.validateRecipientAndUsername(recipient, authorUsername);
		const safeUsername = this.escapeHtml(authorUsername);
		const safeStrollName = this.escapeHtml(strollName);
		const sender = this.parseSender(this.getRequiredConfig('EMAIL_FROM'));

		await this.deliver(
			() =>
				this.getBrevoClient().transactionalEmails.sendTransacEmail({
					sender,
					to: [{ email: recipient }],
					subject: `Cha-ching! "${strollName}" was just purchased \uD83C\uDF89`,
					textContent: [
						`Hey ${authorUsername},`,
						'',
						`Your stroll "${strollName}" was just purchased. Awesome! You've just officially become a little bit famous.`
					].join('\n'),
					htmlContent: this.wrapHtml(
						'Ka-ching!',
						[
							`<p style="margin:0 0 16px;">Hey ${safeUsername}! \uD83D\uDC4B</p>`,
							`<p style="margin:0 0 20px;">Great news \u2014 your stroll <strong>\u201C${safeStrollName}\u201D</strong> was just purchased. Awesome! You've officially become a little bit famous. \uD83C\uDF1F</p>`,
							'<p style="margin:0;">Keep exploring, keep creating \u2014 someone out there is about to walk in your footsteps.</p>'
						].join('')
					)
				}),
			'The stroll purchase notification email could not be delivered.'
		);
	}

	private describeStatusChange(status: StrollActiveStatus): string {
		const copy: Record<StrollActiveStatus, string> = {
			[StrollActiveStatus.PUBLISHED]: "It's live and ready for the world to explore. Go you!",
			[StrollActiveStatus.DRAFT]: "It's tucked back into drafts \u2014 keep polishing, it'll shine.",
			[StrollActiveStatus.ARCHIVED]: "It's been archived. Anyone mid-adventure has been notified.",
			[StrollActiveStatus.SUSPENDED]: "It's been temporarily suspended pending a review of some reported content."
		};
		return copy[status] ?? 'Take a look next time you\u2019re in the app.';
	}

	private statusBadge(safeStatus: string): string {
		return `<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:#ecfeff;color:#0e7490;font-weight:600;font-size:13px;">${safeStatus}</span>`;
	}

	private button(url: string, label: string): string {
		return [
			'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 0;"><tr><td style="border-radius:8px;background:#06b6d4;">',
			`<a href="${url}" style="display:inline-block;padding:12px 24px;font-weight:600;color:#ffffff;text-decoration:none;font-size:15px;">${label}</a>`,
			'</td></tr></table>'
		].join('');
	}

	private wrapHtml(preheader: string, bodyHtml: string): string {
		return [
			'<div style="background:#f1f5f9;padding:32px 16px;font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif;">',
			`<span style="display:none;max-height:0;overflow:hidden;">${this.escapeHtml(preheader)}</span>`,
			'<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.08);">',
			'<div style="background:linear-gradient(135deg,#06b6d4,#0891b2);padding:24px 28px;">',
			'<span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">\uD83D\uDEB6 StrollBar</span>',
			'</div>',
			`<div style="padding:28px;color:#0f172a;font-size:15px;line-height:1.5;">${bodyHtml}</div>`,
			'<div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;">',
			"You're receiving this because you have a StrollBar account. Happy strolling! \uD83C\uDF3F",
			'</div>',
			'</div>',
			'</div>'
		].join('');
	}

	private async deliver(send: () => Promise<unknown>, failureMessage: string): Promise<void> {
		try {
			await withRetry(
				() => {
					this.deliveryAttempts += 1;
					return send();
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
			throw new ServiceUnavailableException(failureMessage);
		}
	}

	private validateRecipientAndUsername(recipient: string, username: string): void {
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || recipient.length > 254) {
			throw new BadRequestException('A valid recipient email address is required.');
		}
		if (!username.trim() || username.length > 50) {
			throw new BadRequestException('A valid username is required.');
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

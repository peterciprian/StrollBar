import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';
import { EmailService } from './email.service';
import { PreferredLanguage } from '../users/entities/user.entity';
import { StrollActiveStatus } from '../strolls/entities/stroll.entity';

jest.mock('@getbrevo/brevo', () => ({ BrevoClient: jest.fn() }));

describe('EmailService', () => {
	const sendTransacEmail = jest.fn();
	const getAccount = jest.fn();
	const mockedBrevoClient = jest.mocked(BrevoClient);
	const validToken = 'f3b91791b6e7d8f565d7d8f565f3b91791b6e7d8f565d7d8f565f3b91791b6f3';

	beforeEach(() => {
		jest.clearAllMocks();
		sendTransacEmail.mockReset();
		getAccount.mockReset();
		mockedBrevoClient.mockImplementation(
			() =>
				({
					account: { getAccount },
					transactionalEmails: { sendTransacEmail }
				}) as never
		);
		sendTransacEmail.mockResolvedValue({ messageId: 'message-id' });
		getAccount.mockResolvedValue({ email: 'account@example.com' });
	});

	it('does not create a Brevo client when delivery is disabled', async () => {
		const service = createService({ EMAIL_DELIVERY_ENABLED: 'false' });
		await service.sendVerificationEmail('walker@example.com', 'Walker', validToken);
		expect(mockedBrevoClient).not.toHaveBeenCalled();
		expect(sendTransacEmail).not.toHaveBeenCalled();
	});

	it('reports delivery as up without touching Brevo when delivery is disabled', async () => {
		const service = createService({ EMAIL_DELIVERY_ENABLED: 'false' });

		await expect(service.checkDeliveryConnectivity()).resolves.toEqual({
			status: 'up',
			provider: 'brevo',
			detail: 'Email delivery is disabled.'
		});
		expect(mockedBrevoClient).not.toHaveBeenCalled();
	});

	it('sends an encoded verification link through the Brevo API', async () => {
		const service = createService({
			EMAIL_DELIVERY_ENABLED: 'true',
			EMAIL_VERIFICATION_URL: 'https://example.com/#/auth/verify-email',
			BREVO_API_KEY: 'brevo-api-key',
			EMAIL_FROM: 'StrollBar <no-reply@example.com>'
		});
		await service.sendVerificationEmail('walker@example.com', 'Walker <Admin>', validToken);
		expect(mockedBrevoClient).toHaveBeenCalledWith({ apiKey: 'brevo-api-key', timeoutInSeconds: 10, maxRetries: 0 });
		expect(sendTransacEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				sender: { name: 'StrollBar', email: 'no-reply@example.com' },
				to: [{ email: 'walker@example.com' }],
				subject: expect.stringContaining('Verify your StrollBar email address'),
				textContent: expect.stringContaining(`https://example.com/#/auth/verify-email?token=${validToken}`),
				htmlContent: expect.stringContaining('Walker &lt;Admin&gt;')
			})
		);
	});

	it('returns a service unavailable error when Brevo rejects delivery', async () => {
		const service = createService({ EMAIL_DELIVERY_ENABLED: 'true', BREVO_API_KEY: 'brevo-api-key', EMAIL_FROM: 'no-reply@example.com' });
		sendTransacEmail.mockRejectedValueOnce(new Error('Brevo unavailable'));
		await expect(service.sendVerificationEmail('walker@example.com', 'Walker', validToken)).rejects.toThrow(ServiceUnavailableException);
	});

	it('rejects invalid verification email parameters before creating a Brevo client', async () => {
		const service = createService({ EMAIL_DELIVERY_ENABLED: 'true', BREVO_API_KEY: 'brevo-api-key', EMAIL_FROM: 'no-reply@example.com' });

		await expect(service.sendVerificationEmail('not-an-email', 'Walker', validToken)).rejects.toThrow(BadRequestException);
		await expect(service.sendVerificationEmail('walker@example.com', 'Walker', 'not-a-token')).rejects.toThrow(BadRequestException);
		expect(mockedBrevoClient).not.toHaveBeenCalled();
	});

	it('rejects invalid verification URLs before sending email', async () => {
		const service = createService({
			EMAIL_DELIVERY_ENABLED: 'true',
			EMAIL_VERIFICATION_URL: 'javascript:alert(1)',
			BREVO_API_KEY: 'brevo-api-key',
			EMAIL_FROM: 'no-reply@example.com'
		});

		await expect(service.sendVerificationEmail('walker@example.com', 'Walker', validToken)).rejects.toThrow(ServiceUnavailableException);
		expect(sendTransacEmail).not.toHaveBeenCalled();
	});

	it('renders Hungarian notification copy from the locale JSON', async () => {
		const service = createService({
			EMAIL_DELIVERY_ENABLED: 'true',
			BREVO_API_KEY: 'brevo-api-key',
			EMAIL_FROM: 'no-reply@example.com'
		});

		await service.sendStrollCreatedEmail('walker@example.com', 'Walker', 'City Lights', PreferredLanguage.HU);

		expect(sendTransacEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				subject: 'Létrehoztad: „City Lights”',
				textContent: expect.stringContaining('A „City Lights” sétád elkészült, gratulálunk!'),
				htmlContent: expect.stringContaining('most egy kicsit híresebb lettél')
			})
		);
	});

	it('renders Hungarian verification copy from the locale JSON', async () => {
		const service = createService({
			EMAIL_DELIVERY_ENABLED: 'true',
			EMAIL_VERIFICATION_URL: 'https://example.com/#/auth/verify-email',
			BREVO_API_KEY: 'brevo-api-key',
			EMAIL_FROM: 'no-reply@example.com'
		});

		await service.sendVerificationEmail('walker@example.com', 'Walker', validToken, PreferredLanguage.HU);

		expect(sendTransacEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				subject: 'Erősítsd meg a StrollBar e-mail-címedet',
				textContent: expect.stringContaining('Már csak egy rövid lépés van hátra'),
				htmlContent: expect.stringContaining('Jó sétát, és kellemes felfedezést!')
			})
		);
	});

	it('renders status change notifications with localized status labels', async () => {
		const service = createService({
			EMAIL_DELIVERY_ENABLED: 'true',
			BREVO_API_KEY: 'brevo-api-key',
			EMAIL_FROM: 'StrollBar <no-reply@example.com>'
		});

		await service.sendStrollStatusChangedEmail('author@example.com', 'Author', 'City Lights', StrollActiveStatus.SUSPENDED, PreferredLanguage.HU);

		expect(sendTransacEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				sender: { name: 'StrollBar', email: 'no-reply@example.com' },
				to: [{ email: 'author@example.com' }],
				subject: expect.stringContaining('City Lights'),
				htmlContent: expect.stringContaining('felfüggesztve')
			})
		);
	});

	it('renders purchase notifications for authors', async () => {
		const service = createService({
			EMAIL_DELIVERY_ENABLED: 'true',
			BREVO_API_KEY: 'brevo-api-key',
			EMAIL_FROM: 'no-reply@example.com'
		});

		await service.sendStrollPurchasedEmail('author@example.com', 'Author <One>', 'Premium Walk', PreferredLanguage.EN);

		expect(sendTransacEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: [{ email: 'author@example.com' }],
				subject: expect.stringContaining('Premium Walk'),
				htmlContent: expect.stringContaining('Author &lt;One&gt;')
			})
		);
	});

	it('checks Brevo API connectivity when delivery is enabled', async () => {
		const service = createService({ EMAIL_DELIVERY_ENABLED: 'true', BREVO_API_KEY: 'brevo-api-key' });
		await expect(service.checkDeliveryConnectivity()).resolves.toMatchObject({ status: 'up', provider: 'brevo' });
		expect(getAccount).toHaveBeenCalled();
	});

	it('reports Brevo connectivity as down when the account check fails', async () => {
		const service = createService({ EMAIL_DELIVERY_ENABLED: 'true', BREVO_API_KEY: 'brevo-api-key' });
		getAccount.mockRejectedValueOnce(new Error('Brevo account endpoint unavailable'));

		await expect(service.checkDeliveryConnectivity()).resolves.toEqual({
			status: 'down',
			provider: 'brevo',
			detail: 'Brevo account endpoint unavailable'
		});
	});
});

function createService(values: Record<string, string>): EmailService {
	const configService = { get: jest.fn((key: string) => values[key]) };
	return new EmailService(configService as unknown as ConfigService);
}

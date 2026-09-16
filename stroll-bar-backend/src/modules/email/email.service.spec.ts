import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';
import { EmailService } from './email.service';
import { PreferredLanguage } from '../users/entities/user.entity';

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

	it('checks Brevo API connectivity when delivery is enabled', async () => {
		const service = createService({ EMAIL_DELIVERY_ENABLED: 'true', BREVO_API_KEY: 'brevo-api-key' });
		await expect(service.checkDeliveryConnectivity()).resolves.toMatchObject({ status: 'up', provider: 'brevo' });
		expect(getAccount).toHaveBeenCalled();
	});
});

function createService(values: Record<string, string>): EmailService {
	const configService = { get: jest.fn((key: string) => values[key]) };
	return new EmailService(configService as unknown as ConfigService);
}

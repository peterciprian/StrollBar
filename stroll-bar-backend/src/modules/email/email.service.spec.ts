import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('EmailService', () => {
	const sendMail = jest.fn();
	const mockedCreateTransport = jest.mocked(createTransport);

	beforeEach(() => {
		jest.clearAllMocks();
		mockedCreateTransport.mockReturnValue({ sendMail } as never);
		sendMail.mockResolvedValue({ messageId: 'message-id' });
	});

	it('does not create an SMTP transport when delivery is disabled', async () => {
		const service = createService({ EMAIL_DELIVERY_ENABLED: 'false' });

		await service.sendVerificationEmail('walker@example.com', 'Walker', 'token');

		expect(mockedCreateTransport).not.toHaveBeenCalled();
		expect(sendMail).not.toHaveBeenCalled();
	});

	it('sends an encoded verification link through the configured SMTP server', async () => {
		const service = createService({
			EMAIL_DELIVERY_ENABLED: 'true',
			EMAIL_VERIFICATION_URL: 'https://example.com/#/auth/verify-email',
			SMTP_HOST: 'smtp.example.com',
			SMTP_PORT: '465',
			SMTP_SECURE: 'true',
			SMTP_USER: 'smtp-user',
			SMTP_PASSWORD: 'smtp-password',
			SMTP_FROM: 'StrollBar <no-reply@example.com>'
		});

		await service.sendVerificationEmail('walker@example.com', 'Walker <Admin>', 'token/value');

		expect(mockedCreateTransport).toHaveBeenCalledWith({
			host: 'smtp.example.com',
			port: 465,
			secure: true,
			auth: { user: 'smtp-user', pass: 'smtp-password' }
		});
		expect(sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				from: 'StrollBar <no-reply@example.com>',
				to: 'walker@example.com',
				subject: 'Verify your StrollBar email address',
				text: expect.stringContaining('https://example.com/#/auth/verify-email?token=token%2Fvalue'),
				html: expect.stringContaining('Walker &lt;Admin&gt;')
			})
		);
	});

	it('returns a service unavailable error when SMTP rejects delivery', async () => {
		const service = createService({
			EMAIL_DELIVERY_ENABLED: 'true',
			SMTP_HOST: 'smtp.example.com',
			SMTP_FROM: 'no-reply@example.com'
		});
		sendMail.mockRejectedValueOnce(new Error('SMTP unavailable'));

		await expect(service.sendVerificationEmail('walker@example.com', 'Walker', 'token')).rejects.toThrow(ServiceUnavailableException);
	});
});

function createService(values: Record<string, string>): EmailService {
	const configService = {
		get: jest.fn((key: string) => values[key])
	};

	return new EmailService(configService as unknown as ConfigService);
}

import { ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common/interfaces';
import { AppErrorCode } from '../utils/app-error-code';
import { StructuredExceptionFilter } from './structured-exception.filter';

describe('StructuredExceptionFilter', () => {
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		loggerSpy.mockRestore();
	});

	it('wraps v2 errors with the backend error code and request metadata', () => {
		const filter = new StructuredExceptionFilter();
		const response = buildResponse({ requestId: 'request-1' });
		const host = buildHost({ accept: 'application/vnd.strollbar.v2+json', response });

		filter.catch(
			new ForbiddenException({
				code: AppErrorCode.EMAIL_NOT_VERIFIED,
				message: 'Verify your email address before creating or modifying content.'
			}),
			host
		);

		expect(response.status).toHaveBeenCalledWith(403);
		expect(response.json).toHaveBeenCalledWith({
			status: 'error',
			error: {
				code: AppErrorCode.EMAIL_NOT_VERIFIED,
				message: 'Verify your email address before creating or modifying content.'
			},
			meta: { requestId: 'request-1', timestamp: expect.any(String), version: 'v2' }
		});
	});

	it('keeps the legacy error shape for clients that do not request v2', () => {
		const filter = new StructuredExceptionFilter();
		const response = buildResponse({ requestId: 'legacy-request' });
		const host = buildHost({ accept: 'application/json', response });

		filter.catch(new ForbiddenException({ code: AppErrorCode.EMAIL_NOT_VERIFIED, message: 'Email is not verified.' }), host);

		expect(response.status).toHaveBeenCalledWith(403);
		expect(response.json).toHaveBeenCalledWith({
			statusCode: 403,
			error: 'Request Error',
			message: 'Email is not verified.'
		});
	});

	it('falls back to HTTP status codes for errors without an explicit code', () => {
		const filter = new StructuredExceptionFilter();
		const response = buildResponse({ requestId: 'request-500' });
		const host = buildHost({ accept: 'application/vnd.strollbar.v2+json', response });

		filter.catch(new InternalServerErrorException('Storage health check failed.'), host);

		expect(response.status).toHaveBeenCalledWith(500);
		expect(response.json).toHaveBeenCalledWith({
			status: 'error',
			error: { code: 'HTTP_500', message: 'Storage health check failed.' },
			meta: { requestId: 'request-500', timestamp: expect.any(String), version: 'v2' }
		});
	});

	it('does not write a response after headers have already been sent', () => {
		const filter = new StructuredExceptionFilter();
		const response = buildResponse({ requestId: 'request-sent', headersSent: true });
		const host = buildHost({ accept: 'application/vnd.strollbar.v2+json', response });

		filter.catch(new ForbiddenException('Already handled.'), host);

		expect(response.status).not.toHaveBeenCalled();
		expect(response.json).not.toHaveBeenCalled();
	});
});

function buildHost({ accept, response }: { accept: string; response: ReturnType<typeof buildResponse> }): ArgumentsHost {
	const request = {
		method: 'POST',
		originalUrl: '/v1/strolls',
		header: jest.fn((name: string) => (name.toLowerCase() === 'accept' ? accept : undefined))
	};

	return {
		switchToHttp: () => ({
			getRequest: () => request,
			getResponse: () => response
		})
	} as ArgumentsHost;
}

function buildResponse({ requestId, headersSent = false }: { requestId: string; headersSent?: boolean }) {
	return {
		headersSent,
		getHeader: jest.fn((name: string) => (name.toLowerCase() === 'x-request-id' ? requestId : undefined)),
		status: jest.fn(function status() {
			return this;
		}),
		json: jest.fn()
	};
}

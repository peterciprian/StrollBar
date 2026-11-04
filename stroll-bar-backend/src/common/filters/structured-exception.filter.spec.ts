import { BadRequestException, ForbiddenException, HttpException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common/interfaces';
import { AppErrorCode } from '../utils/app-error-code';
import { StructuredExceptionFilter } from './structured-exception.filter';

describe('StructuredExceptionFilter', () => {
	let loggerSpy: jest.SpyInstance;
	let warningSpy: jest.SpyInstance;

	beforeEach(() => {
		loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
		warningSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => {
		loggerSpy.mockRestore();
		warningSpy.mockRestore();
	});

	describe.each(['application/json', 'application/vnd.strollbar.v2+json'])('%s', (accept) => {
		it.each([
			...[400, 401, 403, 404, 429, 500, 503].map((statusCode) => ({
				name: `HTTP ${statusCode}`,
				exception: new HttpException('Request failed.', statusCode),
				statusCode,
				message: 'Request failed.'
			})),
			{ name: 'Error', exception: new Error('Private diagnostic.'), statusCode: 500, message: 'Internal server error' },
			{ name: 'non-Error throw', exception: 'unexpected failure', statusCode: 500, message: 'Internal server error' }
		])('preserves the body and logs $name at the appropriate level', ({ exception, statusCode, message }) => {
			const response = buildResponse({ requestId: 'matrix-request' });

			new StructuredExceptionFilter().catch(exception, buildHost({ accept, response }));

			expect(response.status).toHaveBeenCalledWith(statusCode);
			expect(response.json).toHaveBeenCalledWith(
				accept.includes('v2')
					? {
							status: 'error',
							error: { code: `HTTP_${statusCode}`, message },
							meta: { requestId: 'matrix-request', timestamp: expect.any(String), version: 'v2' }
						}
					: { statusCode, error: statusCode >= 500 ? 'Internal Server Error' : 'Request Error', message }
			);
			const record = {
				event: 'http_error',
				requestId: 'matrix-request',
				method: 'POST',
				path: '/v1/strolls',
				statusCode,
				message
			};
			if (statusCode < 500) {
				expect(warningSpy).toHaveBeenCalledTimes(1);
				expect(JSON.parse(warningSpy.mock.calls[0][0])).toEqual(record);
				expect(loggerSpy).not.toHaveBeenCalled();
			} else {
				expect(loggerSpy).toHaveBeenCalledTimes(1);
				expect(JSON.parse(loggerSpy.mock.calls[0][0])).toEqual({
					...record,
					stack: exception instanceof Error ? exception.stack : String(exception)
				});
				expect(warningSpy).not.toHaveBeenCalled();
			}
		});
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

	it('preserves field-specific readiness issues in the v2 error envelope', () => {
		const filter = new StructuredExceptionFilter();
		const response = buildResponse({ requestId: 'readiness-request' });
		const host = buildHost({ accept: 'application/vnd.strollbar.v2+json', response });
		const errors = [{ field: 'stages.0.location', code: 'STAGE_LOCATION_REQUIRED' }];

		filter.catch(new BadRequestException({ code: 'STROLL_NOT_READY', message: 'Not ready.', errors }), host);

		expect(response.status).toHaveBeenCalledWith(400);
		expect(response.json).toHaveBeenCalledWith({
			status: 'error',
			error: { code: 'STROLL_NOT_READY', message: 'Not ready.', errors },
			meta: { requestId: 'readiness-request', timestamp: expect.any(String), version: 'v2' }
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
		expect(warningSpy).toHaveBeenCalledTimes(1);
		expect(loggerSpy).not.toHaveBeenCalled();
	});

	it('still logs diagnostics when a server error occurs after headers are sent', () => {
		const response = buildResponse({ requestId: 'sent-server', headersSent: true });
		const exception = new Error('Late failure.');

		new StructuredExceptionFilter().catch(exception, buildHost({ accept: 'application/json', response }));

		expect(response.status).not.toHaveBeenCalled();
		expect(response.json).not.toHaveBeenCalled();
		expect(JSON.parse(loggerSpy.mock.calls[0][0])).toMatchObject({ event: 'http_error', stack: exception.stack });
	});

	it.each(['fallback-request', undefined])('preserves request ID fallback %s and validation message arrays', (requestId) => {
		const response = buildResponse({});
		const message = ['name is required', 'name must be a string'];
		const errors = [{ field: 'name' }];

		new StructuredExceptionFilter().catch(
			new BadRequestException({ message, errors }),
			buildHost({ accept: 'application/json', response, requestId })
		);

		expect(response.json).toHaveBeenCalledWith({ statusCode: 400, error: 'Request Error', message, errors });
		expect(JSON.parse(warningSpy.mock.calls[0][0])).toMatchObject({ requestId: requestId ?? 'unknown', message });
	});
});

function buildHost({
	accept,
	response,
	requestId
}: {
	accept: string;
	response: ReturnType<typeof buildResponse>;
	requestId?: string;
}): ArgumentsHost {
	const request = {
		method: 'POST',
		originalUrl: '/v1/strolls',
		header: jest.fn((name: string) => (name.toLowerCase() === 'accept' ? accept : name.toLowerCase() === 'x-request-id' ? requestId : undefined))
	};

	return {
		switchToHttp: () => ({
			getRequest: () => request,
			getResponse: () => response
		})
	} as ArgumentsHost;
}

function buildResponse({ requestId, headersSent = false }: { requestId?: string; headersSent?: boolean }) {
	return {
		headersSent,
		getHeader: jest.fn((name: string) => (name.toLowerCase() === 'x-request-id' ? requestId : undefined)),
		status: jest.fn(function status() {
			return this;
		}),
		json: jest.fn()
	};
}

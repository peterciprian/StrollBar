import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class StructuredExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(StructuredExceptionFilter.name);

	catch(exception: unknown, host: ArgumentsHost): void {
		const context = host.switchToHttp();
		const request = context.getRequest<Request>();
		const response = context.getResponse<Response>();
		const statusCode = exception instanceof HttpException ? exception.getStatus() : 500;
		const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
		const message =
			typeof exceptionResponse === 'string'
				? exceptionResponse
				: ((exceptionResponse as { message?: string | string[] } | undefined)?.message ?? 'Internal server error');
		const code = (exceptionResponse as { code?: string } | undefined)?.code ?? `HTTP_${statusCode}`;
		const errors = (exceptionResponse as { errors?: unknown } | undefined)?.errors;
		const requestId = response.getHeader('x-request-id') ?? request.header('x-request-id') ?? 'unknown';
		const isV2 = request.header('accept')?.includes('application/vnd.strollbar.v2+json');

		const logRecord = {
			event: 'http_error',
			requestId,
			method: request.method,
			path: request.originalUrl,
			statusCode,
			message
		};
		if (exception instanceof HttpException && statusCode >= 400 && statusCode < 500) {
			this.logger.warn(JSON.stringify(logRecord));
		} else {
			this.logger.error(
				JSON.stringify({ ...logRecord, stack: exception instanceof Error ? exception.stack : String(exception) })
			);
		}

		if (!response.headersSent) {
			response.status(statusCode).json(
				isV2
					? {
							status: 'error',
							error: { code, message, ...(errors ? { errors } : {}) },
							meta: { requestId, timestamp: new Date().toISOString(), version: 'v2' }
						}
					: { statusCode, error: statusCode >= 500 ? 'Internal Server Error' : 'Request Error', message, ...(errors ? { errors } : {}) }
			);
		}
	}
}

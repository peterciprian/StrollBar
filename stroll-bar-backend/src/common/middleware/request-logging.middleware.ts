import { randomUUID } from 'node:crypto';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
	private readonly logger = new Logger(RequestLoggingMiddleware.name);

	use(request: Request, response: Response, next: NextFunction): void {
		const requestId = request.header('x-request-id') ?? randomUUID();
		const startedAt = Date.now();
		response.setHeader('x-request-id', requestId);
		response.on('finish', () => {
			this.logger.log(
				JSON.stringify({
					event: 'http_request',
					requestId,
					method: request.method,
					path: request.originalUrl,
					statusCode: response.statusCode,
					durationMs: Date.now() - startedAt,
					ip: request.ip
				})
			);
		});
		next();
	}
}

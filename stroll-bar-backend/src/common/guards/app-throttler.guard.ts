import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
	private readonly logger = new Logger(AppThrottlerGuard.name);

	protected async getTracker(request: Record<string, any>): Promise<string> {
		const userId = request.user?.userId;
		if (userId) {
			return `user:${userId}`;
		}

		return request.ips?.[0] ?? request.ip ?? 'unknown';
	}

	protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
		const response = requestProps.context.switchToHttp().getResponse<Record<string, any>>();
		response.setHeader?.('RateLimit-Limit', String(requestProps.limit));
		try {
			return await super.handleRequest(requestProps);
		} catch (error) {
			const retryAfterSeconds = Math.max(1, Math.ceil(requestProps.blockDuration / 1000));
			response.setHeader?.('Retry-After', String(retryAfterSeconds));
			response.setHeader?.('RateLimit-Remaining', '0');
			response.setHeader?.('RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + retryAfterSeconds));
			const request = requestProps.context.switchToHttp().getRequest<Record<string, any>>();
			const tracker = await requestProps.getTracker(request, requestProps.context);
			this.logger.warn(`Rate limit exceeded for ${tracker}`);
			throw error;
		}
	}
}

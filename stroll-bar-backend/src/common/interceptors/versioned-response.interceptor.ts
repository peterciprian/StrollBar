import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type ApiResponse<T> = {
	status: 'success';
	data: T;
	meta: { requestId: string; timestamp: string; version: 'v2' };
};

@Injectable()
export class VersionedResponseInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
		if (!request.headers.accept?.includes('application/vnd.strollbar.v2+json')) {
			return next.handle();
		}

		const response = context.switchToHttp().getResponse<{ getHeader(name: string): string | undefined }>();
		return next.handle().pipe(
			map((data) => ({
				status: 'success' as const,
				data,
				meta: {
					requestId: response.getHeader('x-request-id') ?? 'unknown',
					timestamp: new Date().toISOString(),
					version: 'v2' as const
				}
			}))
		);
	}
}

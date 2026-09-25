import { HttpErrorResponse, HttpEvent, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, lastValueFrom, throwError } from 'rxjs';
import { errorNotificationInterceptor } from './error-notification.interceptor';
import { NotificationService } from './notification.service';

describe('errorNotificationInterceptor', () => {
	let notification: { showError: jest.Mock };

	beforeEach(() => {
		notification = { showError: jest.fn() };

		TestBed.configureTestingModule({
			providers: [{ provide: NotificationService, useValue: notification }]
		});
	});

	it('shows extracted backend errors for non-silent endpoints', async () => {
		const error = new HttpErrorResponse({
			status: 403,
			error: { error: { message: 'Please verify your email before continuing.' } }
		});
		const request = new HttpRequest('POST', '/v1/strolls');

		const result = TestBed.runInInjectionContext(() =>
			errorNotificationInterceptor(request, () => throwError(() => error) as Observable<HttpEvent<unknown>>)
		);

		await expect(lastValueFrom(result)).rejects.toBe(error);
		expect(notification.showError).toHaveBeenCalledWith('Please verify your email before continuing.');
	});

	it('does not notify for background auth session checks', async () => {
		const error = new HttpErrorResponse({ status: 401, error: { message: 'Unauthorized' } });
		const request = new HttpRequest('GET', '/v1/auth/me');

		const result = TestBed.runInInjectionContext(() =>
			errorNotificationInterceptor(request, () => throwError(() => error) as Observable<HttpEvent<unknown>>)
		);

		await expect(lastValueFrom(result)).rejects.toBe(error);
		expect(notification.showError).not.toHaveBeenCalled();
	});
});

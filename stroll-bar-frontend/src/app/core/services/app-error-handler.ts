import { ErrorHandler, Injectable, inject } from '@angular/core';
import { NotificationService } from './notification.service';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
	private readonly notification = inject(NotificationService);

	handleError(error: unknown): void {
		console.error(error);
		this.notification.showErrorWithAction('Something went wrong. Try reloading the page.', 'Reload', () => window.location.reload());
	}
}

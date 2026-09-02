import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
	providedIn: 'root'
})
export class NotificationService {
	constructor(public snackBar: MatSnackBar) {}
	private options: MatSnackBarConfig = {
		duration: 2500,
		horizontalPosition: 'end',
		verticalPosition: 'bottom',
		panelClass: ['lift']
	};

	showSuccess(message: string): void {
		this.options.panelClass = ['lift', 'success'];
		this.snackBar.open(message, 'X', this.options);
	}

	showError(message: string): void {
		this.options.panelClass = ['lift', 'error'];
		this.snackBar.open(message, 'X', this.options);
	}

	showErrorWithAction(message: string, action: string, onAction: () => void): void {
		this.options.panelClass = ['lift', 'error'];
		const snackBarRef = this.snackBar.open(message, action, this.options);
		snackBarRef.onAction().subscribe(onAction);
	}
}

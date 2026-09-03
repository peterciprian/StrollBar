import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface ConfirmDeleteDialogData {
	titleKey: string;
	messageKey: string;
	itemName?: string;
}

@Component({
	selector: 'app-confirm-delete-dialog',
	standalone: true,
	imports: [MatDialogModule, MatButtonModule, MatIconModule, TranslatePipe],
	template: `
		<h2 mat-dialog-title>{{ data.titleKey | translate }}</h2>
		<mat-dialog-content>
			<p>{{ data.messageKey | translate: { itemName: data.itemName ?? '' } }}</p>
		</mat-dialog-content>
		<mat-dialog-actions align="end">
			<button mat-button [mat-dialog-close]="false">{{ 'COMMON.CANCEL' | translate }}</button>
			<button mat-flat-button color="warn" [mat-dialog-close]="true"><mat-icon>delete</mat-icon>{{ 'COMMON.DELETE' | translate }}</button>
		</mat-dialog-actions>
	`
})
export class ConfirmDeleteDialogComponent {
	constructor(@Inject(MAT_DIALOG_DATA) protected readonly data: ConfirmDeleteDialogData) {}
}

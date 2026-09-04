import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export type UnsavedChangesDialogResult = 'save' | 'discard' | 'cancel';

@Component({
	selector: 'app-unsaved-changes-dialog',
	standalone: true,
	imports: [MatDialogModule, MatButtonModule, MatIconModule, TranslatePipe],
	template: `
		<h2 mat-dialog-title>{{ 'COMMON.UNSAVED_CHANGES_TITLE' | translate }}</h2>
		<mat-dialog-content>
			<p>{{ 'COMMON.UNSAVED_CHANGES_MESSAGE' | translate }}</p>
		</mat-dialog-content>
		<mat-dialog-actions align="end">
			<button mat-button [mat-dialog-close]="'cancel'">{{ 'COMMON.CANCEL' | translate }}</button>
			<button mat-button color="warn" [mat-dialog-close]="'discard'">
				<mat-icon>delete_outline</mat-icon>{{ 'COMMON.DISCARD' | translate }}
			</button>
			<button mat-flat-button color="primary" [mat-dialog-close]="'save'"><mat-icon>save</mat-icon>{{ 'COMMON.SAVE' | translate }}</button>
		</mat-dialog-actions>
	`
})
export class UnsavedChangesDialogComponent {}

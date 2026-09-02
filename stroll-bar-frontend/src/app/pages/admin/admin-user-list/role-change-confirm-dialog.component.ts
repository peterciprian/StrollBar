import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface RoleChangeConfirmDialogData {
	username: string;
	currentRoleLabelKey: string;
	nextRoleLabelKey: string;
}

@Component({
	selector: 'app-role-change-confirm-dialog',
	standalone: true,
	imports: [MatDialogModule, MatButtonModule, MatIconModule, TranslatePipe],
	template: `
		<h2 mat-dialog-title>{{ 'SCREENS.ADMIN_USER_LIST.CONFIRM_TITLE' | translate }}</h2>
		<mat-dialog-content>
			<p>
				{{
					'SCREENS.ADMIN_USER_LIST.CONFIRM_MESSAGE'
						| translate
							: {
									username: data.username,
									currentRole: data.currentRoleLabelKey | translate,
									nextRole: data.nextRoleLabelKey | translate
							  }
				}}
			</p>
		</mat-dialog-content>
		<mat-dialog-actions align="end">
			<button mat-button [mat-dialog-close]="false">{{ 'SCREENS.ADMIN_USER_LIST.CONFIRM_CANCEL' | translate }}</button>
			<button mat-flat-button color="primary" [mat-dialog-close]="true">
				<mat-icon>admin_panel_settings</mat-icon>{{ 'SCREENS.ADMIN_USER_LIST.CONFIRM_APPLY' | translate }}
			</button>
		</mat-dialog-actions>
	`
})
export class RoleChangeConfirmDialogComponent {
	constructor(@Inject(MAT_DIALOG_DATA) protected readonly data: RoleChangeConfirmDialogData) {}
}

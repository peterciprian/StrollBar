import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

import { SbButtonComponent } from '../../../components/atoms/sb-button/sb-button.component';
import { SbDialogShellComponent } from '../../../components/atoms/sb-dialog-shell/sb-dialog-shell.component';

export interface RoleChangeConfirmDialogData {
	username: string;
	currentRoleLabelKey: string;
	nextRoleLabelKey: string;
}

@Component({
	selector: 'app-role-change-confirm-dialog',
	standalone: true,
	imports: [MatDialogModule, TranslatePipe, SbButtonComponent, SbDialogShellComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<sb-dialog-shell icon="admin_panel_settings" [title]="'SCREENS.ADMIN_USER_LIST.CONFIRM_TITLE' | translate">
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
			<ng-container sbDialogActions>
				<sb-button variant="tertiary" [label]="'SCREENS.ADMIN_USER_LIST.CONFIRM_CANCEL' | translate" [mat-dialog-close]="false" />
				<sb-button icon="admin_panel_settings" [label]="'SCREENS.ADMIN_USER_LIST.CONFIRM_APPLY' | translate" [mat-dialog-close]="true" />
			</ng-container>
		</sb-dialog-shell>
	`
})
export class RoleChangeConfirmDialogComponent {
	constructor(@Inject(MAT_DIALOG_DATA) protected readonly data: RoleChangeConfirmDialogData) {}
}

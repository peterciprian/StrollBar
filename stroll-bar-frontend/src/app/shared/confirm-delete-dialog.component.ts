import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { SbButtonComponent } from '../components/atoms/sb-button/sb-button.component';
import { SbDialogShellComponent } from '../components/atoms/sb-dialog-shell/sb-dialog-shell.component';

export interface ConfirmDeleteDialogData {
	titleKey: string;
	messageKey: string;
	itemName?: string;
}

@Component({
	selector: 'app-confirm-delete-dialog',
	standalone: true,
	imports: [SbDialogShellComponent, SbButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<sb-dialog-shell [title]="title" icon="delete" tone="danger">
			<p>{{ message }}</p>
			<ng-container sbDialogActions>
				<sb-button variant="ghost" [label]="cancelLabel" (clicked)="close(false)" />
				<sb-button variant="danger" icon="delete" [label]="deleteLabel" (clicked)="close(true)" />
			</ng-container>
		</sb-dialog-shell>
	`
})
export class ConfirmDeleteDialogComponent {
	private readonly translate = inject(TranslateService);
	private readonly dialogRef = inject(MatDialogRef<ConfirmDeleteDialogComponent, boolean>);
	private readonly data = inject<ConfirmDeleteDialogData>(MAT_DIALOG_DATA);

	protected readonly title: string = this.translate.instant(this.data.titleKey);
	protected readonly message: string = this.translate.instant(this.data.messageKey, { itemName: this.data.itemName ?? '' });
	protected readonly cancelLabel: string = this.translate.instant('COMMON.CANCEL');
	protected readonly deleteLabel: string = this.translate.instant('COMMON.DELETE');

	protected close(result: boolean): void {
		this.dialogRef.close(result);
	}
}

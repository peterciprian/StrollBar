import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { SbButtonVariant, SbTone } from '../atom.types';
import { SbButtonComponent } from '../sb-button/sb-button.component';
import { SbDialogShellComponent } from '../sb-dialog-shell/sb-dialog-shell.component';

export interface SbConfirmDialogData {
	/** Already-translated strings; the atom layer stays i18n agnostic. */
	title: string;
	message: string;
	confirmLabel: string;
	cancelLabel: string;
	confirmIcon?: string;
	icon?: string;
	tone?: SbTone;
	confirmVariant?: SbButtonVariant;
}

@Component({
	selector: 'sb-confirm-dialog',
	standalone: true,
	imports: [SbButtonComponent, SbDialogShellComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './sb-confirm-dialog.component.html'
})
export class SbConfirmDialogComponent {
	protected readonly data = inject<SbConfirmDialogData>(MAT_DIALOG_DATA);
	private readonly dialogRef = inject(MatDialogRef<SbConfirmDialogComponent, boolean>);

	protected close(result: boolean): void {
		this.dialogRef.close(result);
	}
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { SbButtonComponent } from '../components/atoms/sb-button/sb-button.component';
import { SbDialogShellComponent } from '../components/atoms/sb-dialog-shell/sb-dialog-shell.component';

export type UnsavedChangesDialogResult = 'save' | 'discard' | 'cancel';

@Component({
	selector: 'app-unsaved-changes-dialog',
	standalone: true,
	imports: [SbDialogShellComponent, SbButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<sb-dialog-shell [title]="title" icon="warning" tone="warning">
			<p>{{ message }}</p>
			<ng-container sbDialogActions>
				<sb-button variant="ghost" [label]="cancelLabel" (clicked)="close('cancel')" />
				<sb-button variant="secondary" icon="delete_outline" [label]="discardLabel" (clicked)="close('discard')" />
				<sb-button variant="primary" icon="save" [label]="saveLabel" (clicked)="close('save')" />
			</ng-container>
		</sb-dialog-shell>
	`
})
export class UnsavedChangesDialogComponent {
	private readonly translate = inject(TranslateService);
	private readonly dialogRef = inject(MatDialogRef<UnsavedChangesDialogComponent, UnsavedChangesDialogResult>);

	protected readonly title: string = this.translate.instant('COMMON.UNSAVED_CHANGES_TITLE');
	protected readonly message: string = this.translate.instant('COMMON.UNSAVED_CHANGES_MESSAGE');
	protected readonly cancelLabel: string = this.translate.instant('COMMON.CANCEL');
	protected readonly discardLabel: string = this.translate.instant('COMMON.DISCARD');
	protected readonly saveLabel: string = this.translate.instant('COMMON.SAVE');

	protected close(result: UnsavedChangesDialogResult): void {
		this.dialogRef.close(result);
	}
}

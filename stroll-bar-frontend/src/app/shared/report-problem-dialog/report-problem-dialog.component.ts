import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

export interface ReportProblemDialogData {
	strollName: string;
}

export const REPORT_PROBLEM_MAX_LENGTH = 300;

@Component({
	selector: 'app-report-problem-dialog',
	standalone: true,
	imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, TranslatePipe],
	templateUrl: './report-problem-dialog.component.html',
	styleUrls: ['./report-problem-dialog.component.scss']
})
export class ReportProblemDialogComponent {
	protected readonly maxLength = REPORT_PROBLEM_MAX_LENGTH;
	protected message = '';
	protected readonly submitting = signal(false);

	constructor(
		private readonly dialogRef: MatDialogRef<ReportProblemDialogComponent, string | null>,
		@Inject(MAT_DIALOG_DATA) protected readonly data: ReportProblemDialogData
	) {}

	protected cancel(): void {
		this.dialogRef.close(null);
	}

	protected send(): void {
		const trimmed = this.message.trim();
		if (!trimmed || this.submitting()) {
			return;
		}

		this.dialogRef.close(trimmed);
	}
}

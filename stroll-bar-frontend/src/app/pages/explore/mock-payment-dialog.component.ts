import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { SbButtonComponent } from '../../components/atoms/sb-button/sb-button.component';
import { SbDialogShellComponent } from '../../components/atoms/sb-dialog-shell/sb-dialog-shell.component';
import { SbIconComponent } from '../../components/atoms/sb-icon/sb-icon.component';

export interface MockPaymentDialogData {
	strollName: string;
	price: number;
}

@Component({
	selector: 'app-mock-payment-dialog',
	standalone: true,
	imports: [CommonModule, TranslatePipe, SbButtonComponent, SbDialogShellComponent, SbIconComponent],
	template: `
		<sb-dialog-shell [title]="'SCREENS.MOCK_PAYMENT.TITLE' | translate" icon="science" tone="primary">
			<div class="mock-payment">
				<div class="mock-payment__eyebrow">{{ 'SCREENS.MOCK_PAYMENT.BADGE' | translate }}</div>
				<p class="mock-payment__intro">{{ 'SCREENS.MOCK_PAYMENT.DESCRIPTION' | translate }}</p>
				<div class="mock-payment__order">
					<div>
						<span>{{ 'SCREENS.MOCK_PAYMENT.STROLL' | translate }}</span>
						<strong>{{ data.strollName }}</strong>
					</div>
					<strong>{{ data.price | number }} {{ 'COMMON.HUF_SUFFIX' | translate }}</strong>
				</div>
				<div class="mock-payment__method">
					<sb-icon name="credit_card" size="md" />
					<div>
						<strong>{{ 'SCREENS.MOCK_PAYMENT.METHOD' | translate }}</strong>
						<span>{{ 'SCREENS.MOCK_PAYMENT.METHOD_DETAIL' | translate }}</span>
					</div>
					<sb-icon class="mock-payment__approved" name="check_circle" size="md" />
				</div>
				<p class="mock-payment__notice"><sb-icon name="info" size="sm" />{{ 'SCREENS.MOCK_PAYMENT.NO_CHARGE' | translate }}</p>
			</div>
			<ng-container sbDialogActions>
				<sb-button variant="ghost" [label]="'SCREENS.MOCK_PAYMENT.CANCEL' | translate" (clicked)="close(false)" />
				<sb-button icon="lock_open" [label]="'SCREENS.MOCK_PAYMENT.CONFIRM' | translate" (clicked)="close(true)" />
			</ng-container>
		</sb-dialog-shell>
	`,
	styles: [
		`
			.mock-payment {
				padding-top: 20px;
			}
			.mock-payment__eyebrow {
				align-items: center;
				color: var(--sb-color-primary);
				display: flex;
				font-size: 11px;
				font-weight: 800;
				gap: 6px;
				padding: 0 24px;
				text-transform: uppercase;
			}
			h2 {
				font-size: 22px;
				margin-bottom: 4px;
				padding-top: 6px;
			}
			.mock-payment__intro {
				color: #64748b;
				line-height: 1.5;
				margin-top: 0;
			}
			.mock-payment__order {
				align-items: center;
				border-block: 1px solid #e2e8f0;
				display: flex;
				gap: 16px;
				justify-content: space-between;
				margin: 18px 0;
				padding: 14px 0;
			}
			.mock-payment__order div span,
			.mock-payment__order div strong,
			.mock-payment__method span {
				display: block;
			}
			.mock-payment__order div span,
			.mock-payment__method span {
				color: #64748b;
				font-size: 12px;
			}
			.mock-payment__order div strong {
				margin-top: 3px;
			}
			.mock-payment__method {
				align-items: center;
				background: #f8fafc;
				border: 1px solid #cbd5e1;
				border-radius: 8px;
				display: grid;
				gap: 12px;
				grid-template-columns: auto 1fr auto;
				padding: 12px;
			}
			.mock-payment__method > sb-icon {
				color: #475569;
			}
			.mock-payment__method .mock-payment__approved {
				color: #15803d;
			}
			.mock-payment__notice {
				align-items: flex-start;
				color: #475569;
				display: flex;
				font-size: 12px;
				gap: 7px;
				line-height: 1.45;
				margin: 14px 0 0;
			}
			.mock-payment__notice sb-icon {
				color: var(--sb-color-primary);
				flex: 0 0 17px;
				font-size: 17px;
				height: 17px;
				margin-top: 1px;
				width: 17px;
			}
		`
	]
})
export class MockPaymentDialogComponent {
	readonly data = inject<MockPaymentDialogData>(MAT_DIALOG_DATA);
	private readonly dialogRef = inject(MatDialogRef<MockPaymentDialogComponent, boolean>);

	protected close(confirmed: boolean): void {
		this.dialogRef.close(confirmed);
	}
}

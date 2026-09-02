import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface MockPaymentDialogData {
	strollName: string;
	price: number;
}

@Component({
	selector: 'app-mock-payment-dialog',
	standalone: true,
	imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, TranslatePipe],
	template: `
		<div class="mock-payment">
			<div class="mock-payment__eyebrow"><mat-icon>science</mat-icon>{{ 'SCREENS.MOCK_PAYMENT.BADGE' | translate }}</div>
			<h2 mat-dialog-title>{{ 'SCREENS.MOCK_PAYMENT.TITLE' | translate }}</h2>
			<mat-dialog-content>
				<p class="mock-payment__intro">{{ 'SCREENS.MOCK_PAYMENT.DESCRIPTION' | translate }}</p>
				<div class="mock-payment__order">
					<div>
						<span>{{ 'SCREENS.MOCK_PAYMENT.STROLL' | translate }}</span
						><strong>{{ data.strollName }}</strong>
					</div>
					<strong>{{ data.price | number }} {{ 'COMMON.HUF_SUFFIX' | translate }}</strong>
				</div>
				<div class="mock-payment__method">
					<mat-icon>credit_card</mat-icon>
					<div>
						<strong>{{ 'SCREENS.MOCK_PAYMENT.METHOD' | translate }}</strong
						><span>{{ 'SCREENS.MOCK_PAYMENT.METHOD_DETAIL' | translate }}</span>
					</div>
					<mat-icon class="mock-payment__approved">check_circle</mat-icon>
				</div>
				<p class="mock-payment__notice"><mat-icon>info</mat-icon>{{ 'SCREENS.MOCK_PAYMENT.NO_CHARGE' | translate }}</p>
			</mat-dialog-content>
			<mat-dialog-actions align="end">
				<button mat-button [mat-dialog-close]="false">{{ 'SCREENS.MOCK_PAYMENT.CANCEL' | translate }}</button>
				<button mat-flat-button color="primary" [mat-dialog-close]="true">
					<mat-icon>lock_open</mat-icon>{{ 'SCREENS.MOCK_PAYMENT.CONFIRM' | translate }}
				</button>
			</mat-dialog-actions>
		</div>
	`,
	styles: [
		`
			.mock-payment {
				padding-top: 20px;
			}
			.mock-payment__eyebrow {
				align-items: center;
				color: #0e7490;
				display: flex;
				font-size: 11px;
				font-weight: 800;
				gap: 6px;
				padding: 0 24px;
				text-transform: uppercase;
			}
			.mock-payment__eyebrow mat-icon {
				font-size: 17px;
				height: 17px;
				width: 17px;
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
			.mock-payment__method > mat-icon {
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
			.mock-payment__notice mat-icon {
				color: #0891b2;
				flex: 0 0 17px;
				font-size: 17px;
				height: 17px;
				margin-top: 1px;
				width: 17px;
			}
			mat-dialog-actions {
				border-top: 1px solid #e2e8f0;
				margin-top: 8px;
				padding: 12px 24px 16px;
			}
		`
	]
})
export class MockPaymentDialogComponent {
	constructor(@Inject(MAT_DIALOG_DATA) readonly data: MockPaymentDialogData) {}
}

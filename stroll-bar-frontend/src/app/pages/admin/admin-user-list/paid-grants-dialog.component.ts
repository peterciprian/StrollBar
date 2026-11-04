import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { CreatePaidGrantRequest, PaidGrant } from '../../../core/api/models';
import { SbButtonComponent } from '../../../components/atoms/sb-button/sb-button.component';
import { SbDialogShellComponent } from '../../../components/atoms/sb-dialog-shell/sb-dialog-shell.component';

export interface PaidGrantsDialogData {
	username: string;
	grants: PaidGrant[];
}

export type PaidGrantsDialogResult =
	{ action: 'create'; request: CreatePaidGrantRequest } | { action: 'revoke' | 'cancel'; grantId: string; reason: string };

function localDateTime(date: Date): string {
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 16);
}

@Component({
	selector: 'app-paid-grants-dialog',
	standalone: true,
	imports: [DatePipe, FormsModule, MatDialogModule, TranslatePipe, SbButtonComponent, SbDialogShellComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './paid-grants-dialog.component.html',
	styleUrl: './paid-grants-dialog.component.scss'
})
export class PaidGrantsDialogComponent {
	protected readonly grantInput = {
		plan: 'creator' as 'creator' | 'premium',
		startsAt: localDateTime(new Date()),
		expiresAt: localDateTime(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
		reason: '',
		revokeReason: ''
	};

	constructor(
		@Inject(MAT_DIALOG_DATA) protected readonly data: PaidGrantsDialogData,
		private readonly dialogRef: MatDialogRef<PaidGrantsDialogComponent, PaidGrantsDialogResult | undefined>
	) {}

	protected createGrant(): void {
		this.dialogRef.close({
			action: 'create',
			request: {
				plan: this.grantInput.plan,
				startsAt: new Date(this.grantInput.startsAt).toISOString(),
				expiresAt: new Date(this.grantInput.expiresAt).toISOString(),
				reason: this.grantInput.reason.trim()
			}
		});
	}

	protected revokeGrant(grant: PaidGrant): void {
		const reason = this.grantInput.revokeReason.trim();
		if (!reason) return;
		this.dialogRef.close({ action: 'revoke', grantId: grant.id, reason });
	}

	protected canRevoke(grant: PaidGrant): boolean {
		return (grant.status === 'active' || grant.status === 'cancelled') && new Date(grant.expiresAt).getTime() > Date.now();
	}

	protected cancelGrant(grant: PaidGrant): void {
		const reason = this.grantInput.revokeReason.trim();
		if (!reason || !this.canCancel(grant)) return;
		this.dialogRef.close({ action: 'cancel', grantId: grant.id, reason });
	}

	protected canCancel(grant: PaidGrant): boolean {
		return grant.status === 'active' && new Date(grant.expiresAt).getTime() > Date.now();
	}

	protected hasRevocableGrant(): boolean {
		return this.data.grants.some((grant) => this.canRevoke(grant));
	}
}

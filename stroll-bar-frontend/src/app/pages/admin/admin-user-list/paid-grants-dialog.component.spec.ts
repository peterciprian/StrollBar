import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PaidGrant } from '../../../core/api/models';
import { PaidGrantsDialogComponent } from './paid-grants-dialog.component';

describe('PaidGrantsDialogComponent', () => {
	let fixture: ComponentFixture<PaidGrantsDialogComponent>;
	let host: HTMLElement;
	let dialogRef: { close: jest.Mock };

	const futureGrant: PaidGrant = {
		id: 'grant-1',
		plan: 'creator',
		status: 'active',
		startsAt: '2026-01-01T00:00:00.000Z',
		expiresAt: '2027-01-01T00:00:00.000Z',
		reason: 'support'
	};

	beforeEach(() => {
		dialogRef = { close: jest.fn() };
		TestBed.configureTestingModule({
			imports: [PaidGrantsDialogComponent],
			providers: [
				provideTranslateService(),
				{ provide: MAT_DIALOG_DATA, useValue: { username: 'walker', grants: [futureGrant] } },
				{ provide: MatDialogRef, useValue: dialogRef }
			]
		});
		fixture = TestBed.createComponent(PaidGrantsDialogComponent);
		fixture.detectChanges();
		host = fixture.nativeElement as HTMLElement;
	});

	it('submits a bounded Creator/Premium grant as UTC ISO timestamps with a reason', () => {
		const select = host.querySelector<HTMLSelectElement>('select[name="plan"]')!;
		select.value = 'premium';
		select.dispatchEvent(new Event('change'));
		const startsAt = host.querySelector<HTMLInputElement>('input[name="startsAt"]')!;
		startsAt.value = '2026-11-04T10:30';
		startsAt.dispatchEvent(new Event('input'));
		const expiresAt = host.querySelector<HTMLInputElement>('input[name="expiresAt"]')!;
		expiresAt.value = '2027-01-01T10:30';
		expiresAt.dispatchEvent(new Event('input'));
		const reason = host.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')!;
		reason.value = 'Approved access';
		reason.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

		expect(dialogRef.close).toHaveBeenCalledWith({
			action: 'create',
			request: {
				plan: 'premium',
				startsAt: new Date('2026-11-04T10:30').toISOString(),
				expiresAt: new Date('2027-01-01T10:30').toISOString(),
				reason: 'Approved access'
			}
		});
	});

	it('requires an explicit reason before a current paid grant can be revoked', () => {
		const revokeButton = Array.from(host.querySelectorAll<HTMLButtonElement>('sb-button button')).find((button) =>
			button.textContent?.includes('SCREENS.ADMIN_USER_LIST.GRANT_REVOKE')
		)!;
		revokeButton.click();
		expect(dialogRef.close).not.toHaveBeenCalled();

		const reason = host.querySelector<HTMLTextAreaElement>('textarea[name="revokeReason"]')!;
		reason.value = 'Incorrect grant';
		reason.dispatchEvent(new Event('input'));
		fixture.detectChanges();
		revokeButton.click();

		expect(dialogRef.close).toHaveBeenCalledWith({
			action: 'revoke',
			grantId: 'grant-1',
			reason: 'Incorrect grant'
		});
	});

	it('emits paid-through cancellation distinctly from immediate revoke', () => {
		const button = Array.from(host.querySelectorAll<HTMLButtonElement>('sb-button button')).find((item) =>
			item.textContent?.includes('SCREENS.ADMIN_USER_LIST.GRANT_CANCEL')
		)!;
		expect(button.disabled).toBe(true);
		const reason = host.querySelector<HTMLTextAreaElement>('textarea[name="revokeReason"]')!;
		reason.value = 'Customer request';
		reason.dispatchEvent(new Event('input'));
		fixture.detectChanges();
		button.click();
		expect(dialogRef.close).toHaveBeenCalledWith({ action: 'cancel', grantId: 'grant-1', reason: 'Customer request' });
		expect(host.textContent).toContain('SCREENS.ADMIN_USER_LIST.GRANT_CANCEL_HELP');
	});
});

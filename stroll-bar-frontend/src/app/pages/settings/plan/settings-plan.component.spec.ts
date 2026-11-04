import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { ApiClientService } from '../../../core/api/api-client.service';
import { UserRole } from '../../../core/models/user-role.enum';
import { SettingsPlanComponent } from './settings-plan.component';

describe('SettingsPlanComponent', () => {
	let fixture: ComponentFixture<SettingsPlanComponent>;
	let host: HTMLElement;
	let api: { getMyEntitlement: jest.Mock; cancelMyPaidGrant: jest.Mock };

	beforeEach(() => {
		api = {
			cancelMyPaidGrant: jest.fn().mockReturnValue(of({})),
			getMyEntitlement: jest.fn().mockReturnValue(
				of({
					plan: UserRole.CREATOR,
					paidThroughAt: '2027-01-01T00:00:00.000Z',
					fallbackPlan: UserRole.SIMPLE,
					paidGrants: [
						{
							id: 'grant-1',
							plan: 'creator',
							status: 'active',
							startsAt: '2026-01-01T00:00:00.000Z',
							expiresAt: '2027-01-01T00:00:00.000Z',
							cancelledAt: null
						}
					],
					creationLimits: { public: 20, private: 3 },
					creationUsage: { public: 4, private: 1 },
					purchaseLimits: { public: null, private: null },
					purchaseUsage: { public: 6, private: 2 }
				})
			)
		};
		TestBed.configureTestingModule({
			imports: [SettingsPlanComponent],
			providers: [provideRouter([]), provideTranslateService(), { provide: ApiClientService, useValue: api }]
		});
	});

	function render(): void {
		fixture = TestBed.createComponent(SettingsPlanComponent);
		fixture.detectChanges();
		host = fixture.nativeElement as HTMLElement;
	}

	it('shows effective plan, paid-through fallback, and separate creation/purchase quota usage', () => {
		render();

		expect(api.getMyEntitlement).toHaveBeenCalledTimes(1);
		expect(host.textContent).toContain('SCREENS.ADMIN_USER_LIST.ROLE_CREATOR');
		expect(host.textContent).toContain('SETTINGS.CREATION_QUOTA_TITLE');
		expect(host.textContent).toContain('SETTINGS.PURCHASE_QUOTA_TITLE');
		expect(host.textContent).toContain('SETTINGS.QUOTA_USAGE');
		expect(host.textContent).toContain('SETTINGS.QUOTA_LIMIT');
		expect(host.textContent).toContain('SETTINGS.UNLIMITED');
		expect(host.textContent).toContain('SETTINGS.PAID_THROUGH');
	});

	it('shows a useful error when the entitlement endpoint fails', () => {
		api.getMyEntitlement.mockReturnValue(throwError(() => new Error('offline')));
		render();

		expect(host.textContent).toContain('SETTINGS.PLAN_ERROR');
	});

	it('cancels the owned grant via the dedicated endpoint and refreshes the effective plan', () => {
		render();
		const button = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find((item) =>
			item.textContent?.includes('SETTINGS.CANCEL_GRANT')
		)!;
		button.click();
		expect(api.cancelMyPaidGrant).toHaveBeenCalledWith('grant-1');
		expect(api.getMyEntitlement).toHaveBeenCalledTimes(2);
	});

	it('reports cancellation errors without hiding existing access', () => {
		api.cancelMyPaidGrant.mockReturnValue(throwError(() => new Error('offline')));
		render();
		Array.from(host.querySelectorAll<HTMLButtonElement>('button'))
			.find((item) => item.textContent?.includes('SETTINGS.CANCEL_GRANT'))!
			.click();
		fixture.detectChanges();
		expect(host.textContent).toContain('SETTINGS.CANCEL_ERROR');
		expect(host.textContent).toContain('SCREENS.ADMIN_USER_LIST.ROLE_CREATOR');
	});

	it('shows cancelled-through access but no repeat Cancel action', () => {
		const value = {
			plan: UserRole.ADMIN,
			paidThroughAt: null,
			fallbackPlan: null,
			paidGrants: [{ id: 'g', plan: 'premium', status: 'cancelled', expiresAt: '2027-01-01T00:00:00Z' }],
			creationLimits: { public: null, private: null },
			creationUsage: { public: 0, private: 0 },
			purchaseLimits: { public: null, private: null },
			purchaseUsage: { public: 0, private: 0 }
		};
		api.getMyEntitlement.mockReturnValue(of(value));
		render();
		expect(host.textContent).toContain('SCREENS.ADMIN_USER_LIST.ROLE_ADMIN');
		expect(host.textContent).toContain('SETTINGS.CANCELLED_THROUGH');
		expect(host.textContent).not.toContain('SETTINGS.CANCEL_GRANT');
		expect(host.textContent).not.toContain('SETTINGS.PAID_THROUGH');
	});
});

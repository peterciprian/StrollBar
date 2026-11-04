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
	let api: { getMyEntitlement: jest.Mock };

	beforeEach(() => {
		api = {
			getMyEntitlement: jest.fn().mockReturnValue(of({
				plan: UserRole.CREATOR,
				paidThroughAt: '2027-01-01T00:00:00.000Z',
				creationLimits: { public: 20, private: 3 },
				creationUsage: { public: 4, private: 1 },
				purchaseLimits: { public: null, private: null },
				purchaseUsage: { public: 6, private: 2 }
			}))
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
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { PlansPageComponent } from './plans-page.component';

describe('PlansPageComponent', () => {
	let fixture: ComponentFixture<PlansPageComponent>;
	let host: HTMLElement;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [PlansPageComponent],
			providers: [provideRouter([]), provideTranslateService()]
		});
		fixture = TestBed.createComponent(PlansPageComponent);
		fixture.detectChanges();
		host = fixture.nativeElement as HTMLElement;
	});

	it('explains plan quotas and keeps upgrade disabled while checkout is unavailable', () => {
		expect(host.textContent).toContain('PLANS.SIMPLE_DESCRIPTION');
		expect(host.textContent).toContain('PLANS.CREATOR_DESCRIPTION');
		expect(host.textContent).toContain('PLANS.PREMIUM_DESCRIPTION');
		expect(host.textContent).toContain('PLANS.QUOTA_NOTE');
		const upgrade = host.querySelector<HTMLButtonElement>('sb-button button');
		expect(upgrade?.disabled).toBe(true);
		expect(upgrade?.textContent).toContain('PLANS.UPGRADE_COMING_SOON');
	});
});

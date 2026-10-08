import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';

import { SbButtonComponent } from './sb-button.component';

describe('SbButtonComponent', () => {
	let fixture: ComponentFixture<SbButtonComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [SbButtonComponent],
			providers: [provideRouter([])]
		}).compileComponents();
		fixture = TestBed.createComponent(SbButtonComponent);
	});

	function render(inputs: Record<string, unknown> = {}): HTMLElement {
		Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it('renders a button with the given label', () => {
		const host = render({ label: 'Mentés' });
		expect(host.querySelector('button')).not.toBeNull();
		expect(host.textContent).toContain('Mentés');
	});

	it('exposes variant and size on the host for styling', () => {
		render({ label: 'X', variant: 'danger', size: 'lg' });
		const host = fixture.nativeElement as HTMLElement;
		expect(host.getAttribute('data-variant')).toBe('danger');
		expect(host.getAttribute('data-size')).toBe('lg');
	});

	it('emits clicked when enabled', () => {
		const spy = jest.fn();
		fixture.componentInstance.clicked.subscribe(spy);
		const host = render({ label: 'X' });
		host.querySelector('button')!.click();
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('does not emit clicked while loading', () => {
		const spy = jest.fn();
		fixture.componentInstance.clicked.subscribe(spy);
		const host = render({ label: 'X', loading: true });
		host.querySelector('button')!.click();
		expect(spy).not.toHaveBeenCalled();
	});

	it('shows a spinner instead of the leading icon while loading', () => {
		const host = render({ label: 'X', icon: 'save', loading: true });
		expect(host.querySelector('mat-progress-spinner')).not.toBeNull();
		expect(host.querySelector('sb-icon')).toBeNull();
	});

	it('renders an anchor when routerLink is provided', () => {
		const host = render({ label: 'X', routerLink: '/home' });
		expect(host.querySelector('a')).not.toBeNull();
		expect(host.querySelector('button')).toBeNull();
	});

	it.each([
		{ state: 'disabled', inputs: { disabled: true } },
		{ state: 'loading', inputs: { loading: true } }
	])('keeps a $state router link inert', ({ inputs }) => {
		const router = TestBed.inject(Router);
		const navigateSpy = jest.spyOn(router, 'navigateByUrl');
		const clickedSpy = jest.fn();
		fixture.componentInstance.clicked.subscribe(clickedSpy);
		const host = render({ label: 'X', routerLink: '/home', tooltip: 'Unavailable', ...inputs });
		const link = host.querySelector('a');

		expect(link).not.toBeNull();
		link!.click();
		expect(navigateSpy).not.toHaveBeenCalled();
		expect(clickedSpy).not.toHaveBeenCalled();
	});

	it.each([
		{ state: 'disabled', inputs: { disabled: true } },
		{ state: 'loading', inputs: { loading: true } }
	])('keeps a $state href inert', ({ inputs }) => {
		const clickedSpy = jest.fn();
		fixture.componentInstance.clicked.subscribe(clickedSpy);
		const host = render({ label: 'X', href: 'https://example.com', target: '_blank', tooltip: 'Unavailable', ...inputs });
		const link = host.querySelector('a')!;
		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });

		expect(link.getAttribute('href')).toBeNull();
		expect(link.getAttribute('aria-disabled')).toBe('true');
		expect(link.tabIndex).toBe(-1);
		expect(fixture.debugElement.query(By.directive(MatTooltip)).injector.get(MatTooltip).message).toBe('Unavailable');
		link.dispatchEvent(clickEvent);
		expect(clickEvent.defaultPrevented).toBe(true);
		expect(clickedSpy).not.toHaveBeenCalled();
	});

	it('renders leading and trailing icons', () => {
		const host = render({ label: 'X', icon: 'add', trailingIcon: 'chevron_right' });
		expect(fixture.debugElement.queryAll(By.css('sb-icon')).length).toBe(2);
		expect(host.textContent).toContain('add');
	});
});

import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { SbAlertComponent } from './sb-alert/sb-alert.component';
import { SbAvatarComponent } from './sb-avatar/sb-avatar.component';
import { SbBadgeComponent } from './sb-badge/sb-badge.component';
import { SbCardComponent } from './sb-card/sb-card.component';
import { SbCheckboxComponent } from './sb-checkbox/sb-checkbox.component';
import { SbEmptyStateComponent } from './sb-empty-state/sb-empty-state.component';
import { SbIconComponent } from './sb-icon/sb-icon.component';
import { SbIconButtonComponent } from './sb-icon-button/sb-icon-button.component';
import { SbInputComponent } from './sb-input/sb-input.component';
import { SbLoadingStateComponent } from './sb-loading-state/sb-loading-state.component';
import { SbPageHeaderComponent } from './sb-page-header/sb-page-header.component';
import { SbProgressBarComponent } from './sb-progress-bar/sb-progress-bar.component';
import { SbSearchFieldComponent } from './sb-search-field/sb-search-field.component';
import { SbSelectComponent } from './sb-select/sb-select.component';
import { SbSpinnerComponent } from './sb-spinner/sb-spinner.component';
import { SbStarRatingComponent } from './sb-star-rating/sb-star-rating.component';
import { SbStatGridComponent } from './sb-stat-grid/sb-stat-grid.component';
import { SbTableComponent } from './sb-table/sb-table.component';
import { SbTextareaComponent } from './sb-textarea/sb-textarea.component';

@Component({
	standalone: true,
	imports: [ReactiveFormsModule, SbInputComponent],
	template: `
		<form [formGroup]="form">
			<sb-input formControlName="password" [errorMessages]="errorMessages" [errorMessage]="errorMessage" />
		</form>
	`
})
class SbInputValidationHostComponent {
	errorMessage: string | null = null;
	readonly errorMessages = {
		commonPassword: 'Túl gyakori',
		passwordComplexity: 'Nem elég összetett'
	};
	readonly form = new FormGroup({
		password: new FormControl('password123', [() => ({ passwordComplexity: true, commonPassword: true })])
	});
}

@Component({
	standalone: true,
	imports: [ReactiveFormsModule, SbInputComponent],
	template: `
		<form [formGroup]="form">
			<sb-input formControlName="password" [errorMessages]="errorMessages" />
		</form>
	`
})
class SbInputChangingErrorHostComponent {
	readonly errorMessages = { required: 'Required', minlength: 'Too short' };
	readonly form = new FormGroup({
		password: new FormControl('', [Validators.required, Validators.minLength(8)])
	});
}

describe('atom library', () => {
	it('renders the icon glyph and hides it from screen readers by default', () => {
		const fixture = TestBed.createComponent(SbIconComponent);
		fixture.componentRef.setInput('name', 'search');
		fixture.detectChanges();
		const glyph = fixture.nativeElement.querySelector('mat-icon') as HTMLElement;
		expect(glyph.textContent?.trim()).toBe('search');
		expect(glyph.getAttribute('aria-hidden')).toBe('true');
	});

	it('renders the 32px feature icon size class', () => {
		const fixture = TestBed.createComponent(SbIconComponent);
		fixture.componentRef.setInput('name', 'castle');
		fixture.componentRef.setInput('size', 'feature');
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('mat-icon')!.classList).toContain('sb-icon--feature');
	});

	it('exposes the icon to screen readers when a label is given', () => {
		const fixture = TestBed.createComponent(SbIconComponent);
		fixture.componentRef.setInput('name', 'search');
		fixture.componentRef.setInput('ariaLabel', 'Keresés');
		fixture.detectChanges();
		const glyph = fixture.nativeElement.querySelector('mat-icon') as HTMLElement;
		expect(glyph.getAttribute('aria-label')).toBe('Keresés');
		expect(glyph.getAttribute('role')).toBe('img');
	});

	it('requires an accessible name on the icon button', () => {
		const fixture = TestBed.createComponent(SbIconButtonComponent);
		fixture.componentRef.setInput('icon', 'delete');
		fixture.componentRef.setInput('ariaLabel', 'Törlés');
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('button')!.getAttribute('aria-label')).toBe('Törlés');
	});

	it('does not emit from a disabled icon button', () => {
		const fixture = TestBed.createComponent(SbIconButtonComponent);
		const spy = jest.fn();
		fixture.componentInstance.clicked.subscribe(spy);
		fixture.componentRef.setInput('icon', 'delete');
		fixture.componentRef.setInput('ariaLabel', 'Törlés');
		fixture.componentRef.setInput('disabled', true);
		fixture.detectChanges();
		fixture.nativeElement.querySelector('button')!.click();
		expect(spy).not.toHaveBeenCalled();
	});

	it('renders the badge tone on the host', () => {
		const fixture = TestBed.createComponent(SbBadgeComponent);
		fixture.componentRef.setInput('label', 'Aktív');
		fixture.componentRef.setInput('tone', 'success');
		fixture.detectChanges();
		expect((fixture.nativeElement as HTMLElement).getAttribute('data-tone')).toBe('success');
		expect((fixture.nativeElement as HTMLElement).textContent).toContain('Aktív');
	});

	it('renders a spinner with a label', () => {
		const fixture = TestBed.createComponent(SbSpinnerComponent);
		fixture.componentRef.setInput('label', 'Betöltés');
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('mat-progress-spinner')).not.toBeNull();
		expect((fixture.nativeElement as HTMLElement).textContent).toContain('Betöltés');
	});

	it('renders the progress bar value text', () => {
		const fixture = TestBed.createComponent(SbProgressBarComponent);
		fixture.componentRef.setInput('value', 42);
		fixture.componentRef.setInput('valueText', '42%');
		fixture.detectChanges();
		expect((fixture.nativeElement as HTMLElement).textContent).toContain('42%');
	});

	it('falls back to initials when the avatar has no image', () => {
		const fixture = TestBed.createComponent(SbAvatarComponent);
		fixture.componentRef.setInput('name', 'Kovács Anna');
		fixture.detectChanges();
		expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('KA');
	});

	it('emits the selected star rating', () => {
		const fixture = TestBed.createComponent(SbStarRatingComponent);
		const spy = jest.fn();
		fixture.componentInstance.valueChange.subscribe(spy);
		fixture.detectChanges();
		const buttons = fixture.nativeElement.querySelectorAll('button');
		(buttons[2] as HTMLButtonElement).click();
		expect(spy).toHaveBeenCalledWith(3);
	});

	it('does not emit from a readonly star rating', () => {
		const fixture = TestBed.createComponent(SbStarRatingComponent);
		fixture.componentRef.setInput('readonly', true);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelectorAll('button').length).toBe(0);
	});

	it('marks a clickable card as a button for assistive tech', () => {
		const fixture = TestBed.createComponent(SbCardComponent);
		fixture.componentRef.setInput('clickable', true);
		fixture.detectChanges();
		const host = fixture.nativeElement as HTMLElement;
		expect(host.getAttribute('role')).toBe('button');
		expect(host.getAttribute('tabindex')).toBe('0');
	});

	it('does not emit from a non-clickable card', () => {
		const fixture = TestBed.createComponent(SbCardComponent);
		const spy = jest.fn();
		fixture.componentInstance.activated.subscribe(spy);
		fixture.detectChanges();
		(fixture.nativeElement as HTMLElement).click();
		expect(spy).not.toHaveBeenCalled();
	});

	it('renders the page header title and subtitle', () => {
		const fixture = TestBed.createComponent(SbPageHeaderComponent);
		fixture.componentRef.setInput('title', 'Séták');
		fixture.componentRef.setInput('subtitle', 'Összes séta kezelése');
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('h1')!.textContent).toContain('Séták');
		expect((fixture.nativeElement as HTMLElement).textContent).toContain('Összes séta kezelése');
	});

	it('renders every stat tile', () => {
		const fixture = TestBed.createComponent(SbStatGridComponent);
		fixture.componentRef.setInput('stats', [
			{ label: 'Összes', value: 12 },
			{ label: 'Aktív', value: 3, tone: 'success' }
		]);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelectorAll('.sb-stat-grid__tile').length).toBe(2);
	});

	it('renders the empty state description', () => {
		const fixture = TestBed.createComponent(SbEmptyStateComponent);
		fixture.componentRef.setInput('title', 'Nincs adat');
		fixture.componentRef.setInput('description', 'Hozz létre egy elemet.');
		fixture.detectChanges();
		expect((fixture.nativeElement as HTMLElement).textContent).toContain('Hozz létre egy elemet.');
	});

	it('renders the dismiss control only when a label is supplied', () => {
		const fixture = TestBed.createComponent(SbAlertComponent);
		fixture.componentRef.setInput('message', 'Hiba történt');
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('sb-icon-button')).toBeNull();

		fixture.componentRef.setInput('dismissLabel', 'Bezárás');
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('sb-icon-button')).not.toBeNull();
	});

	describe('sb-loading-state', () => {
		it('shows a spinner while loading', () => {
			const fixture = TestBed.createComponent(SbLoadingStateComponent);
			fixture.componentRef.setInput('state', 'loading');
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('sb-spinner')).not.toBeNull();
		});

		it('offers a retry action on error', () => {
			const fixture = TestBed.createComponent(SbLoadingStateComponent);
			const spy = jest.fn();
			fixture.componentInstance.retried.subscribe(spy);
			fixture.componentRef.setInput('state', 'error');
			fixture.componentRef.setInput('errorTitle', 'Hiba');
			fixture.componentRef.setInput('retryLabel', 'Újra');
			fixture.detectChanges();
			fixture.nativeElement.querySelector('sb-button button')!.click();
			expect(spy).toHaveBeenCalled();
		});

		it('shows the empty state title', () => {
			const fixture = TestBed.createComponent(SbLoadingStateComponent);
			fixture.componentRef.setInput('state', 'empty');
			fixture.componentRef.setInput('emptyTitle', 'Nincs találat');
			fixture.detectChanges();
			expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nincs találat');
		});
	});

	describe('form atoms', () => {
		it('propagates input changes through the value accessor', () => {
			const fixture = TestBed.createComponent(SbInputComponent);
			const spy = jest.fn();
			fixture.componentInstance.registerOnChange(spy);
			fixture.componentInstance.writeValue('alap');
			fixture.detectChanges();

			const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
			expect(input.value).toBe('alap');

			input.value = 'új';
			input.dispatchEvent(new Event('input'));
			expect(spy).toHaveBeenCalledWith('új');
		});

		it('preserves number values for number inputs', () => {
			const fixture = TestBed.createComponent(SbInputComponent);
			const spy = jest.fn();
			fixture.componentInstance.registerOnChange(spy);
			fixture.componentRef.setInput('type', 'number');
			fixture.detectChanges();
			const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
			input.value = '12.5';
			input.dispatchEvent(new Event('input'));
			expect(spy).toHaveBeenCalledWith(12.5);
		});

		it('marks the input as touched on blur', () => {
			const fixture = TestBed.createComponent(SbInputComponent);
			const spy = jest.fn();
			fixture.componentInstance.registerOnTouched(spy);
			fixture.detectChanges();
			fixture.nativeElement.querySelector('input')!.dispatchEvent(new Event('blur'));
			expect(spy).toHaveBeenCalled();
		});

		it('disables the input when the form sets the disabled state', () => {
			const fixture = TestBed.createComponent(SbInputComponent);
			fixture.componentInstance.setDisabledState(true);
			fixture.detectChanges();
			expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).disabled).toBe(true);
		});

		it('renders an explicit error on first render', () => {
			const fixture = TestBed.createComponent(SbInputValidationHostComponent);
			fixture.componentInstance.errorMessage = 'Explicit error';
			fixture.detectChanges();
			const atom = fixture.debugElement.query(By.directive(SbInputComponent)).componentInstance as unknown as {
				showError: () => boolean;
				errorText: () => string | null;
			};
			expect(atom.showError()).toBe(true);
			expect(atom.errorText()).toBe('Explicit error');
			expect(fixture.nativeElement.querySelector('.sb-form-control__error[role="alert"]')?.textContent).toContain('Explicit error');
		});

		it('uses configured error-message order when multiple validators fail', () => {
			const fixture = TestBed.createComponent(SbInputValidationHostComponent);
			fixture.detectChanges();
			(fixture.nativeElement.querySelector('input') as HTMLInputElement).dispatchEvent(new Event('blur'));
			fixture.detectChanges();
			const atom = fixture.debugElement.query(By.directive(SbInputComponent)).componentInstance as unknown as {
				showError: () => boolean;
				errorText: () => string | null;
			};
			expect(atom.showError()).toBe(true);
			expect(atom.errorText()).toBe('Túl gyakori');
			expect(fixture.nativeElement.querySelector('.sb-form-control__error[role="alert"]')?.textContent).toContain('Túl gyakori');
		});

		it('updates the error message when a different validator starts failing', () => {
			const fixture = TestBed.createComponent(SbInputChangingErrorHostComponent);
			fixture.detectChanges();
			const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
			input.dispatchEvent(new Event('blur'));
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('.sb-form-control__error')?.textContent).toContain('Required');

			input.value = 'short';
			input.dispatchEvent(new Event('input'));
			fixture.detectChanges();

			expect(fixture.nativeElement.querySelector('.sb-form-control__error')?.textContent).toContain('Too short');
		});

		it('propagates textarea changes', () => {
			const fixture = TestBed.createComponent(SbTextareaComponent);
			const spy = jest.fn();
			fixture.componentInstance.registerOnChange(spy);
			fixture.detectChanges();
			const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
			textarea.value = 'leírás';
			textarea.dispatchEvent(new Event('input'));
			expect(spy).toHaveBeenCalledWith('leírás');
		});

		it('propagates checkbox changes', () => {
			const fixture = TestBed.createComponent(SbCheckboxComponent);
			const spy = jest.fn();
			fixture.componentInstance.registerOnChange(spy);
			fixture.componentRef.setInput('label', 'Elfogadom');
			fixture.detectChanges();
			(fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
			expect(spy).toHaveBeenCalledWith(true);
		});

		it('renders every select option', () => {
			const fixture = TestBed.createComponent(SbSelectComponent);
			fixture.componentRef.setInput('options', [
				{ value: 'a', label: 'A' },
				{ value: 'b', label: 'B' }
			]);
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('mat-select')).not.toBeNull();
		});

		it('shows the clear control once the search field has a term', () => {
			const fixture = TestBed.createComponent(SbSearchFieldComponent);
			fixture.componentRef.setInput('clearLabel', 'Törlés');
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('sb-icon-button')).toBeNull();

			const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
			input.value = 'buda';
			input.dispatchEvent(new Event('input'));
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('sb-icon-button')).not.toBeNull();
		});
	});

	describe('sb-table', () => {
		const columns = [
			{ key: 'name', header: 'Név' },
			{ key: 'city', header: 'Város', sortable: true }
		];
		const rows = [
			{ name: 'Séta A', city: 'Budapest' },
			{ name: 'Séta B', city: 'Pécs' }
		];

		function createTable() {
			const fixture = TestBed.createComponent(SbTableComponent);
			fixture.componentRef.setInput('columns', columns);
			fixture.componentRef.setInput('rows', rows);
			return fixture;
		}

		it('renders a row per data item and a cell per column', () => {
			const fixture = createTable();
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
			expect(fixture.nativeElement.querySelectorAll('tbody tr:first-child td').length).toBe(2);
			expect((fixture.nativeElement as HTMLElement).textContent).toContain('Budapest');
		});

		it('emits sortChange with a toggled direction', () => {
			const fixture = createTable();
			const spy = jest.fn();
			fixture.componentInstance.sortChange.subscribe(spy);
			fixture.componentRef.setInput('sort', { key: 'city', direction: 'asc' });
			fixture.detectChanges();
			(fixture.nativeElement.querySelector('.sb-table__sort') as HTMLButtonElement).click();
			expect(spy).toHaveBeenCalledWith({ key: 'city', direction: 'desc' });
		});

		it('only emits rowClick when rows are clickable', () => {
			const fixture = createTable();
			const spy = jest.fn();
			fixture.componentInstance.rowClick.subscribe(spy);
			fixture.detectChanges();
			(fixture.nativeElement.querySelector('tbody tr') as HTMLElement).click();
			expect(spy).not.toHaveBeenCalled();

			fixture.componentRef.setInput('rowClickable', true);
			fixture.detectChanges();
			(fixture.nativeElement.querySelector('tbody tr') as HTMLElement).click();
			expect(spy).toHaveBeenCalledWith(rows[0]);
		});

		it('emits rowDoubleClick for a row', () => {
			const fixture = createTable();
			const spy = jest.fn();
			fixture.componentInstance.rowDoubleClick.subscribe(spy);
			fixture.detectChanges();
			(fixture.nativeElement.querySelector('tbody tr') as HTMLElement).dispatchEvent(new MouseEvent('dblclick'));
			expect(spy).toHaveBeenCalledWith(rows[0]);
		});

		it.each([
			{ description: 'an anchor', tagName: 'a', attributes: { href: '#' } },
			{ description: 'a button', tagName: 'button', attributes: {} },
			{ description: 'a checkbox input', tagName: 'input', attributes: { type: 'checkbox' } },
			{ description: 'a radio input', tagName: 'input', attributes: { type: 'radio' } },
			{ description: 'a select', tagName: 'select', attributes: {} },
			{ description: 'a textarea', tagName: 'textarea', attributes: {} },
			{ description: 'a label', tagName: 'label', attributes: {} },
			{ description: 'a summary', tagName: 'summary', attributes: {} },
			{ description: 'an editable element', tagName: 'div', attributes: { contenteditable: 'true' } },
			{ description: 'an ARIA button', tagName: 'div', attributes: { role: 'button' } },
			{ description: 'an ARIA link', tagName: 'div', attributes: { role: 'link' } },
			{ description: 'an ARIA checkbox', tagName: 'div', attributes: { role: 'checkbox' } },
			{ description: 'an ARIA radio', tagName: 'div', attributes: { role: 'radio' } },
			{ description: 'an ARIA switch', tagName: 'div', attributes: { role: 'switch' } },
			{ description: 'an ARIA menu item', tagName: 'div', attributes: { role: 'menuitem' } },
			{ description: 'an ARIA menu item checkbox', tagName: 'div', attributes: { role: 'menuitemcheckbox' } },
			{ description: 'an ARIA menu item radio', tagName: 'div', attributes: { role: 'menuitemradio' } },
			{ description: 'an ARIA option', tagName: 'div', attributes: { role: 'option' } },
			{ description: 'an ARIA tab', tagName: 'div', attributes: { role: 'tab' } },
			{ description: 'an ARIA textbox', tagName: 'div', attributes: { role: 'textbox' } },
			{ description: 'an ARIA searchbox', tagName: 'div', attributes: { role: 'searchbox' } },
			{ description: 'an ARIA combobox', tagName: 'div', attributes: { role: 'combobox' } },
			{ description: 'an ARIA slider', tagName: 'div', attributes: { role: 'slider' } },
			{ description: 'an ARIA spinbutton', tagName: 'div', attributes: { role: 'spinbutton' } }
		])('does not emit rowDoubleClick for $description', ({ tagName, attributes }) => {
			const fixture = createTable();
			const spy = jest.fn();
			fixture.componentInstance.rowDoubleClick.subscribe(spy);
			fixture.detectChanges();

			const interactive = document.createElement(tagName);
			for (const [name, value] of Object.entries(attributes)) interactive.setAttribute(name, value);
			(fixture.nativeElement.querySelector('tbody tr td') as HTMLElement).appendChild(interactive);
			interactive.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

			expect(spy).not.toHaveBeenCalled();
		});

		it('shows the empty state instead of an empty table body', () => {
			const fixture = createTable();
			fixture.componentRef.setInput('rows', []);
			fixture.componentRef.setInput('emptyTitle', 'Nincs séta');
			fixture.detectChanges();
			expect(fixture.nativeElement.querySelector('table')).toBeNull();
			expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nincs séta');
		});

		it('shows the error state when loading failed', () => {
			const fixture = createTable();
			fixture.componentRef.setInput('error', true);
			fixture.componentRef.setInput('errorTitle', 'Hiba');
			fixture.detectChanges();
			expect((fixture.nativeElement as HTMLElement).textContent).toContain('Hiba');
		});
	});
});

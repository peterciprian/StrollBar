import { ChangeDetectorRef, DestroyRef, Directive, OnInit, computed, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NgControl, ValidationErrors } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Shared plumbing for form atoms: CVA wiring plus the label/hint/error inputs that every
 * control in the library exposes. Errors are read from the bound `NgControl` when present.
 */
@Directive()
export abstract class SbFormControlBase<T> implements ControlValueAccessor, OnInit {
	readonly label = input<string | null>(null);
	readonly hint = input<string | null>(null);
	readonly placeholder = input<string>('');
	readonly required = input(false);
	readonly disabled = input(false);
	/** Overrides the message derived from the bound control's validation errors. */
	readonly errorMessage = input<string | null>(null);
	/** Already-translated messages keyed by validator name, e.g. `{ required: 'Kötelező' }`. */
	readonly errorMessages = input<Record<string, string>>({});

	protected readonly value = signal<T | null>(null);
	protected readonly touched = signal(false);
	protected readonly disabledByForm = signal(false);
	private readonly controlStateVersion = signal(0);
	private readonly cdr = inject(ChangeDetectorRef);

	protected readonly ngControl = inject(NgControl, { optional: true, self: true });
	private readonly destroyRef = inject(DestroyRef);

	private onChange: (value: T | null) => void = () => undefined;
	private onTouched: () => void = () => undefined;

	constructor() {
		if (this.ngControl) {
			this.ngControl.valueAccessor = this;
		}
	}

	ngOnInit(): void {
		this.ngControl?.control?.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
			this.controlStateVersion.update((version) => version + 1);
			this.cdr.detectChanges();
		});
	}

	writeValue(value: T | null): void {
		this.value.set(value);
	}

	registerOnChange(fn: (value: T | null) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		this.disabledByForm.set(isDisabled);
	}

	protected get isDisabled(): boolean {
		return this.disabled() || this.disabledByForm();
	}

	protected commit(value: T | null): void {
		this.value.set(value);
		this.onChange(value);
	}

	protected markTouched(): void {
		if (!this.touched()) {
			this.touched.set(true);
		}
		this.onTouched();
		this.cdr.detectChanges();
	}

	protected get validationErrors(): ValidationErrors | null {
		return this.ngControl?.control?.errors ?? null;
	}

	protected readonly showError = computed(() => {
		this.controlStateVersion();
		if (this.errorMessage()) return true;
		const control = this.ngControl?.control;
		return !!control && control.invalid && (this.touched() || control.touched || control.dirty);
	});

	protected readonly errorText = computed(() => {
		const explicit = this.errorMessage();
		if (explicit) return explicit;
		const errors = this.validationErrors;
		if (!errors) return null;
		const messages = this.errorMessages();
		const messageKey = Object.keys(messages).find((key) => key in errors);
		return messageKey ? messages[messageKey] : null;
	});
}

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Control-level (not group-level) so the `passwordMismatch` error surfaces through the sb-* form atoms,
 * which only read errors from their own control. Re-run it when the other control changes.
 */
export function matchesControlValidator(otherControlName: string): ValidatorFn {
	return (control: AbstractControl): ValidationErrors | null => {
		const other = control.parent?.get(otherControlName);
		if (!other || !control.value) {
			return null;
		}

		return control.value === other.value ? null : { passwordMismatch: true };
	};
}

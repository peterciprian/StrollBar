import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const COMMON_PASSWORDS = new Set([
	'12345678',
	'password',
	'password123',
	'Password123',
	'Password123!',
	'qwerty123',
	'letmein123',
	'welcome123',
	'admin123',
	'P@ssw0rd'
]);

export const passwordPolicyValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
	const password = String(control.value ?? '');
	if (!password) {
		return null;
	}

	const errors: ValidationErrors = {};
	if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,128}$/.test(password)) {
		errors['passwordComplexity'] = true;
	}
	if (COMMON_PASSWORDS.has(password)) {
		errors['commonPassword'] = true;
	}

	return Object.keys(errors).length ? errors : null;
};

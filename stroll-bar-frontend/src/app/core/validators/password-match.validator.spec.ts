import { FormControl, FormGroup } from '@angular/forms';
import { matchesControlValidator } from './password-match.validator';

describe('matchesControlValidator', () => {
	function createForm(password: string, confirmation: string) {
		const form = new FormGroup({
			newPassword: new FormControl(password),
			confirmPassword: new FormControl(confirmation, matchesControlValidator('newPassword'))
		});
		form.controls.confirmPassword.updateValueAndValidity();
		return form;
	}

	it('accepts a matching confirmation', () => {
		expect(createForm('StrollWalk!2026', 'StrollWalk!2026').controls.confirmPassword.errors).toBeNull();
	});

	it('flags a different confirmation', () => {
		expect(createForm('StrollWalk!2026', 'StrollWalk!2027').controls.confirmPassword.errors).toEqual({ passwordMismatch: true });
	});

	it('leaves an empty confirmation to the required validator', () => {
		expect(createForm('StrollWalk!2026', '').controls.confirmPassword.errors).toBeNull();
	});

	it('ignores controls without the referenced sibling', () => {
		expect(matchesControlValidator('newPassword')(new FormControl('value'))).toBeNull();
	});
});

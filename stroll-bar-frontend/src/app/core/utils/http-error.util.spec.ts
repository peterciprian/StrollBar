import { HttpErrorResponse } from '@angular/common/http';
import { extractErrorCode, extractErrorMessage } from './http-error.util';

describe('http error utilities', () => {
	it('extracts validation messages from legacy error responses', () => {
		const error = new HttpErrorResponse({
			status: 400,
			error: { message: ['Name is required', 'Description is required'] }
		});

		expect(extractErrorMessage(error)).toBe('Name is required, Description is required');
	});

	it('extracts machine codes and messages from v2 error envelopes', () => {
		const error = new HttpErrorResponse({
			status: 403,
			error: {
				status: 'error',
				error: {
					code: 'EMAIL_NOT_VERIFIED',
					message: 'Please verify your email before continuing.'
				}
			}
		});

		expect(extractErrorCode(error)).toBe('EMAIL_NOT_VERIFIED');
		expect(extractErrorMessage(error)).toBe('Please verify your email before continuing.');
	});

	it('uses a network-specific message for status 0 failures', () => {
		const error = new HttpErrorResponse({ status: 0 });

		expect(extractErrorMessage(error)).toBe('Network error. Please check your connection.');
	});
});

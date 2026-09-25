import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService', () => {
	afterEach(() => {
		localStorage.clear();
		TestBed.resetTestingModule();
	});

	it('stores and clears tokens in the browser', () => {
		TestBed.configureTestingModule({
			providers: [{ provide: PLATFORM_ID, useValue: 'browser' }]
		});

		const service = TestBed.inject(TokenStorageService);

		service.setTokens('access-token', 'refresh-token');

		expect(service.getAccessToken()).toBe('access-token');
		expect(service.getRefreshToken()).toBe('refresh-token');

		service.clear();

		expect(service.getAccessToken()).toBeNull();
		expect(service.getRefreshToken()).toBeNull();
	});

	it('does not touch localStorage on the server', () => {
		const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
		const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
		const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

		TestBed.configureTestingModule({
			providers: [{ provide: PLATFORM_ID, useValue: 'server' }]
		});

		const service = TestBed.inject(TokenStorageService);

		service.setTokens('access-token', 'refresh-token');
		service.clear();

		expect(service.getAccessToken()).toBeNull();
		expect(service.getRefreshToken()).toBeNull();
		expect(getItemSpy).not.toHaveBeenCalled();
		expect(setItemSpy).not.toHaveBeenCalled();
		expect(removeItemSpy).not.toHaveBeenCalled();
	});
});

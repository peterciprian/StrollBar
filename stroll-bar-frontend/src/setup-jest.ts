import '@angular/compiler';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn()
	}))
});

class ResizeObserverMock {
	observe = jest.fn();
	unobserve = jest.fn();
	disconnect = jest.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
	writable: true,
	value: ResizeObserverMock
});

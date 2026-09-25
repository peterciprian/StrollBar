const { createCjsPreset } = require('jest-preset-angular/presets');

module.exports = {
	...createCjsPreset(),
	setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
	testMatch: ['<rootDir>/src/**/*.spec.ts'],
	collectCoverageFrom: ['src/app/**/*.ts', '!src/app/**/*.routes.ts', '!src/app/**/*.server.ts', '!src/app/**/models.ts'],
	coverageDirectory: '<rootDir>/coverage/jest',
	coverageReporters: ['text-summary', 'lcov'],
	moduleNameMapper: {
		'\\.(css|scss|sass|less)$': '<rootDir>/src/test-mocks/style-mock.cjs'
	}
};

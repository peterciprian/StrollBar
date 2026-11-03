import { getStrollReadinessIssues } from './stroll-readiness.util';

describe('stroll readiness', () => {
	it('reports field-specific errors for blank stroll and stage fields and missing location', () => {
		expect(
			getStrollReadinessIssues('  ', '', [{ name: ' ', description: ' ', latitude: 47.5, longitude: null }])
		).toEqual([
			{ field: 'name', code: 'STROLL_NAME_REQUIRED' },
			{ field: 'description', code: 'STROLL_DESCRIPTION_REQUIRED' },
			{ field: 'stages.0.name', code: 'STAGE_NAME_REQUIRED' },
			{ field: 'stages.0.description', code: 'STAGE_DESCRIPTION_REQUIRED' },
			{ field: 'stages.0.location', code: 'STAGE_LOCATION_REQUIRED' }
		]);
	});

	it('accepts a nonblank address or a complete in-range coordinate pair', () => {
		const stages = [
			{ name: 'Address', description: 'Address description', address: '  Main Street ' },
			{ name: 'Coordinates', description: 'Coordinates description', latitude: -90, longitude: 180 }
		];

		expect(getStrollReadinessIssues('A stroll', 'A description', stages)).toEqual([]);
	});

	it('requires at least one stage and rejects out-of-range coordinates as location', () => {
		expect(getStrollReadinessIssues('A stroll', 'A description', [])).toEqual([
			{ field: 'stages', code: 'STROLL_STAGE_REQUIRED' }
		]);
		expect(
			getStrollReadinessIssues('A stroll', 'A description', [
				{ name: 'Stage', description: 'Stage description', latitude: 90.1, longitude: 181 }
			])
		).toContainEqual({ field: 'stages.0.location', code: 'STAGE_LOCATION_REQUIRED' });
	});
});

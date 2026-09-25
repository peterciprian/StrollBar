import { StrollCategory } from '../strolls/dto/stroll-category.enum';
import { BadgeStats, evaluateRules, rulesUseMetaMetric } from './badge-rules';

describe('badge rule evaluation', () => {
	const stats: BadgeStats = {
		createdStrollsCount: 2,
		publishedStrollsCount: 1,
		purchasedStrollsCount: 5,
		activeStrollsCount: 1,
		completedStrollsCount: 4,
		completionRate: 80,
		reviewsCount: 3,
		shortestCompletionSeconds: 900,
		totalDistanceKm: 12.5,
		flawlessCompletions: 2,
		correctRiddleAnswersCount: 7,
		nightOwlCompletions: 1,
		earlyBirdCompletions: 1,
		weekendCompletions: 2,
		maxCompletionsInSingleDay: 2,
		distinctCategoriesCompleted: 2,
		completedCategories: new Set([StrollCategory.HISTORICAL, StrollCategory.ARCHITECTURE]),
		totalBadgesEarned: 3
	};

	it('requires every condition in a rule set to pass', () => {
		expect(
			evaluateRules(
				[
					{ metric: 'completedStrollsCount', operator: 'gte', value: 4 },
					{ metric: 'completionRate', operator: 'gte', value: 75 },
					{ metric: 'flawlessCompletions', operator: 'eq', value: 2 }
				],
				stats
			)
		).toBe(true);

		expect(
			evaluateRules(
				[
					{ metric: 'completedStrollsCount', operator: 'gte', value: 4 },
					{ metric: 'completionRate', operator: 'gt', value: 95 }
				],
				stats
			)
		).toBe(false);
	});

	it('does not match empty rule sets automatically', () => {
		expect(evaluateRules([], stats)).toBe(false);
	});

	it('supports every numeric comparison operator', () => {
		expect(evaluateRules([{ metric: 'reviewsCount', operator: 'gte', value: 3 }], stats)).toBe(true);
		expect(evaluateRules([{ metric: 'reviewsCount', operator: 'gt', value: 2 }], stats)).toBe(true);
		expect(evaluateRules([{ metric: 'reviewsCount', operator: 'lte', value: 3 }], stats)).toBe(true);
		expect(evaluateRules([{ metric: 'reviewsCount', operator: 'lt', value: 4 }], stats)).toBe(true);
		expect(evaluateRules([{ metric: 'reviewsCount', operator: 'eq', value: 3 }], stats)).toBe(true);
	});

	it('requires a shortest completion before shortest-time rules can match', () => {
		expect(evaluateRules([{ metric: 'shortestCompletionSeconds', operator: 'lte', value: 1200 }], stats)).toBe(true);
		expect(
			evaluateRules([{ metric: 'shortestCompletionSeconds', operator: 'lte', value: 1200 }], {
				...stats,
				shortestCompletionSeconds: null
			})
		).toBe(false);
	});

	it('matches category completion rules against the completed category set', () => {
		expect(evaluateRules([{ metric: 'categoryCompleted', operator: 'eq', value: StrollCategory.HISTORICAL }], stats)).toBe(true);
		expect(evaluateRules([{ metric: 'categoryCompleted', operator: 'eq', value: StrollCategory.GASTRO }], stats)).toBe(false);
	});

	it('detects rules that must run in the meta pass', () => {
		expect(rulesUseMetaMetric([{ metric: 'totalBadgesEarned', operator: 'gte', value: 3 }])).toBe(true);
		expect(rulesUseMetaMetric([{ metric: 'completedStrollsCount', operator: 'gte', value: 3 }])).toBe(false);
	});
});

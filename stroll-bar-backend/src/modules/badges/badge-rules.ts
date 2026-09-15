import { StrollCategory } from '../strolls/dto/stroll-category.enum';

export interface BadgeStats {
	createdStrollsCount: number;
	publishedStrollsCount: number;
	purchasedStrollsCount: number;
	activeStrollsCount: number;
	completedStrollsCount: number;
	completionRate: number;
	reviewsCount: number;
	shortestCompletionSeconds: number | null;
	totalDistanceKm: number;
	flawlessCompletions: number;
	correctRiddleAnswersCount: number;
	nightOwlCompletions: number;
	earlyBirdCompletions: number;
	weekendCompletions: number;
	maxCompletionsInSingleDay: number;
	distinctCategoriesCompleted: number;
	completedCategories: Set<StrollCategory>;
	// Only meaningful for rules evaluated in the meta pass (see BadgesService).
	totalBadgesEarned: number;
}

export const BADGE_METRICS = [
	'createdStrollsCount',
	'publishedStrollsCount',
	'purchasedStrollsCount',
	'activeStrollsCount',
	'completedStrollsCount',
	'completionRate',
	'reviewsCount',
	'shortestCompletionSeconds',
	'totalDistanceKm',
	'flawlessCompletions',
	'correctRiddleAnswersCount',
	'nightOwlCompletions',
	'earlyBirdCompletions',
	'weekendCompletions',
	'maxCompletionsInSingleDay',
	'distinctCategoriesCompleted',
	'categoryCompleted',
	'totalBadgesEarned'
] as const;
export type BadgeMetric = (typeof BADGE_METRICS)[number];

export const BADGE_OPERATORS = ['gte', 'gt', 'lte', 'lt', 'eq'] as const;
export type BadgeOperator = (typeof BADGE_OPERATORS)[number];

export interface BadgeRuleCondition {
	metric: BadgeMetric;
	operator: BadgeOperator;
	// Numeric metrics compare against a number; `categoryCompleted` compares against a StrollCategory name.
	value: number | string;
}

// Metric that references the user's own badge count must be evaluated in a second pass,
// after all other badges for this run have already been awarded/revoked.
export function isMetaMetric(metric: BadgeMetric): boolean {
	return metric === 'totalBadgesEarned';
}

export function rulesUseMetaMetric(rules: BadgeRuleCondition[]): boolean {
	return rules.some((rule) => isMetaMetric(rule.metric));
}

function compare(actual: number, operator: BadgeOperator, expected: number): boolean {
	switch (operator) {
		case 'gte':
			return actual >= expected;
		case 'gt':
			return actual > expected;
		case 'lte':
			return actual <= expected;
		case 'lt':
			return actual < expected;
		case 'eq':
			return actual === expected;
	}
}

function evaluateCondition(condition: BadgeRuleCondition, stats: BadgeStats): boolean {
	if (condition.metric === 'categoryCompleted') {
		return stats.completedCategories.has(String(condition.value) as StrollCategory);
	}

	if (condition.metric === 'shortestCompletionSeconds' && stats.shortestCompletionSeconds === null) {
		return false;
	}

	const actual = stats[condition.metric] as number;
	const expected = Number(condition.value);
	return compare(actual, condition.operator, expected);
}

// Empty rule sets never match automatically; badges without rules must be managed manually.
export function evaluateRules(rules: BadgeRuleCondition[], stats: BadgeStats): boolean {
	if (!rules.length) return false;
	return rules.every((condition) => evaluateCondition(condition, stats));
}

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
	nightOwlCompletions: number;
	earlyBirdCompletions: number;
	weekendCompletions: number;
	maxCompletionsInSingleDay: number;
	completedCategories: Set<StrollCategory>;
}

export interface BadgeDefinition {
	code: string;
	icon: string;
	title: string;
	description: string;
	// Evaluated against live stats; badges awarded here are permanent once earned.
	criteria?: (stats: BadgeStats) => boolean;
	// Meta badges are evaluated after all stat-based badges, against the user's total badge count.
	minimumBadgeCount?: number;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
	{
		code: 'FIRST_ADVENTURE',
		icon: 'hiking',
		title: 'First Steps',
		description: 'Completed your first adventure.',
		criteria: (stats) => stats.completedStrollsCount >= 1
	},
	{
		code: 'FIVE_ADVENTURES',
		icon: 'directions_walk',
		title: 'Explorer',
		description: 'Completed 5 adventures.',
		criteria: (stats) => stats.completedStrollsCount >= 5
	},
	{
		code: 'TEN_ADVENTURES',
		icon: 'map',
		title: 'Wanderer',
		description: 'Completed 10 adventures.',
		criteria: (stats) => stats.completedStrollsCount >= 10
	},
	{
		code: 'HUNDRED_ADVENTURES',
		icon: 'public',
		title: 'Legend of the Streets',
		description: 'Completed 100 adventures.',
		criteria: (stats) => stats.completedStrollsCount >= 100
	},
	{
		code: 'FIRST_PURCHASE',
		icon: 'shopping_bag',
		title: 'Getting Started',
		description: 'Purchased your first stroll.',
		criteria: (stats) => stats.purchasedStrollsCount >= 1
	},
	{
		code: 'TEN_PURCHASES',
		icon: 'shopping_cart',
		title: 'Collector',
		description: 'Purchased 10 strolls.',
		criteria: (stats) => stats.purchasedStrollsCount >= 10
	},
	{
		code: 'FLAWLESS_RUN',
		icon: 'verified',
		title: 'Perfectionist',
		description: 'Completed an adventure without a single wrong answer.',
		criteria: (stats) => stats.flawlessCompletions >= 1
	},
	{
		code: 'FLAWLESS_FIVE',
		icon: 'military_tech',
		title: 'Flawless Streak',
		description: 'Completed 5 adventures without a single wrong answer.',
		criteria: (stats) => stats.flawlessCompletions >= 5
	},
	{
		code: 'SPEED_30MIN',
		icon: 'directions_run',
		title: 'Speed Walker',
		description: 'Finished an adventure in under 30 minutes.',
		criteria: (stats) => stats.shortestCompletionSeconds !== null && stats.shortestCompletionSeconds <= 1800
	},
	{
		code: 'SPEED_15MIN',
		icon: 'bolt',
		title: 'Sprinter',
		description: 'Finished an adventure in under 15 minutes.',
		criteria: (stats) => stats.shortestCompletionSeconds !== null && stats.shortestCompletionSeconds <= 900
	},
	{
		code: 'DISTANCE_20KM',
		icon: 'straighten',
		title: 'Marathoner',
		description: 'Walked a combined 20 km across completed adventures.',
		criteria: (stats) => stats.totalDistanceKm >= 20
	},
	{
		code: 'DISTANCE_50KM',
		icon: 'flight_takeoff',
		title: 'Globetrotter',
		description: 'Walked a combined 50 km across completed adventures.',
		criteria: (stats) => stats.totalDistanceKm >= 50
	},
	{
		code: 'NIGHT_OWL',
		icon: 'dark_mode',
		title: 'Night Owl',
		description: 'Completed an adventure between 10 PM and 5 AM.',
		criteria: (stats) => stats.nightOwlCompletions >= 1
	},
	{
		code: 'EARLY_BIRD',
		icon: 'wb_twilight',
		title: 'Early Bird',
		description: 'Completed an adventure before 7 AM.',
		criteria: (stats) => stats.earlyBirdCompletions >= 1
	},
	{
		code: 'WEEKEND_WANDERER',
		icon: 'weekend',
		title: 'Weekend Wanderer',
		description: 'Completed 3 adventures on weekends.',
		criteria: (stats) => stats.weekendCompletions >= 3
	},
	{
		code: 'BUSY_DAY',
		icon: 'event_repeat',
		title: 'Busy Day',
		description: 'Completed 3 adventures in a single day.',
		criteria: (stats) => stats.maxCompletionsInSingleDay >= 3
	},
	{
		code: 'CATEGORY_EXPLORER',
		icon: 'category',
		title: 'Category Explorer',
		description: 'Completed strolls in 3 different categories.',
		criteria: (stats) => stats.completedCategories.size >= 3
	},
	{
		code: 'CATEGORY_MASTER',
		icon: 'workspace_premium',
		title: 'Category Master',
		description: 'Completed strolls in 6 different categories.',
		criteria: (stats) => stats.completedCategories.size >= 6
	},
	{
		code: 'FIRST_STROLL_CREATED',
		icon: 'edit_road',
		title: 'Storyteller',
		description: 'Created your first stroll.',
		criteria: (stats) => stats.createdStrollsCount >= 1
	},
	{
		code: 'FIVE_STROLLS_CREATED',
		icon: 'auto_stories',
		title: 'Prolific Creator',
		description: 'Created 5 strolls.',
		criteria: (stats) => stats.createdStrollsCount >= 5
	},
	{
		code: 'FIRST_PUBLISHED',
		icon: 'publish',
		title: 'Published Author',
		description: 'Published your first stroll.',
		criteria: (stats) => stats.publishedStrollsCount >= 1
	},
	{
		code: 'FIRST_REVIEW',
		icon: 'rate_review',
		title: 'Critic',
		description: 'Wrote your first review.',
		criteria: (stats) => stats.reviewsCount >= 1
	},
	{
		code: 'TEN_REVIEWS',
		icon: 'reviews',
		title: 'Seasoned Reviewer',
		description: 'Wrote 10 reviews.',
		criteria: (stats) => stats.reviewsCount >= 10
	},
	{
		code: 'RENAISSANCE_STROLLER',
		icon: 'diversity_3',
		title: 'Well Rounded',
		description: 'Created, completed, and reviewed a stroll.',
		criteria: (stats) => stats.createdStrollsCount >= 1 && stats.completedStrollsCount >= 1 && stats.reviewsCount >= 1
	},
	{
		code: 'ACTIVE_ADVENTURER',
		icon: 'sync',
		title: 'Juggler',
		description: 'Had 3 strolls purchased or in progress at the same time.',
		criteria: (stats) => stats.activeStrollsCount >= 3
	},
	{
		code: 'HISTORIAN',
		icon: 'castle',
		title: 'Historian',
		description: 'Completed a historical stroll.',
		criteria: (stats) => stats.completedCategories.has(StrollCategory.HISTORICAL)
	},
	{
		code: 'FOODIE',
		icon: 'restaurant',
		title: 'Foodie',
		description: 'Completed a food & drink stroll.',
		criteria: (stats) => stats.completedCategories.has(StrollCategory.GASTRO)
	},
	{
		code: 'ART_LOVER',
		icon: 'palette',
		title: 'Art Lover',
		description: 'Completed an art stroll.',
		criteria: (stats) => stats.completedCategories.has(StrollCategory.ART)
	},
	{
		code: 'ATHLETE',
		icon: 'sports_score',
		title: 'Athlete',
		description: 'Completed a sports stroll.',
		criteria: (stats) => stats.completedCategories.has(StrollCategory.SPORTS)
	},
	{
		code: 'PILGRIM',
		icon: 'church',
		title: 'Pilgrim',
		description: 'Completed a religious stroll.',
		criteria: (stats) => stats.completedCategories.has(StrollCategory.RELIGION)
	},
	{
		code: 'NATURE_LOVER',
		icon: 'park',
		title: 'Nature Lover',
		description: 'Completed a landscape stroll.',
		criteria: (stats) => stats.completedCategories.has(StrollCategory.LANDSCAPE)
	},
	{
		code: 'BADGE_COLLECTOR',
		icon: 'emoji_events',
		title: 'Badge Collector',
		description: 'Earned 10 badges.',
		minimumBadgeCount: 10
	}
];

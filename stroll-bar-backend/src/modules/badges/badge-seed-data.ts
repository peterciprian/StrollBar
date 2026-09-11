import { BadgeRuleCondition } from './badge-rules';

export interface BadgeSeedDefinition {
	code: string;
	icon: string;
	title: string;
	description: string;
	rules: BadgeRuleCondition[];
}

// Seed data for the initial badge_definitions rows (see the UserBadges migration that follows).
// These mirror the badges that used to be hardcoded; admins can add/edit/remove freely from here on.
export const BADGE_SEED_DATA: BadgeSeedDefinition[] = [
	{
		code: 'FIRST_ADVENTURE',
		icon: 'hiking',
		title: 'First Steps',
		description: 'Completed your first adventure.',
		rules: [{ metric: 'completedStrollsCount', operator: 'gte', value: 1 }]
	},
	{
		code: 'FIVE_ADVENTURES',
		icon: 'directions_walk',
		title: 'Explorer',
		description: 'Completed 5 adventures.',
		rules: [{ metric: 'completedStrollsCount', operator: 'gte', value: 5 }]
	},
	{
		code: 'TEN_ADVENTURES',
		icon: 'map',
		title: 'Wanderer',
		description: 'Completed 10 adventures.',
		rules: [{ metric: 'completedStrollsCount', operator: 'gte', value: 10 }]
	},
	{
		code: 'HUNDRED_ADVENTURES',
		icon: 'public',
		title: 'Legend of the Streets',
		description: 'Completed 100 adventures.',
		rules: [{ metric: 'completedStrollsCount', operator: 'gte', value: 100 }]
	},
	{
		code: 'FIRST_PURCHASE',
		icon: 'shopping_bag',
		title: 'Getting Started',
		description: 'Purchased your first stroll.',
		rules: [{ metric: 'purchasedStrollsCount', operator: 'gte', value: 1 }]
	},
	{
		code: 'TEN_PURCHASES',
		icon: 'shopping_cart',
		title: 'Collector',
		description: 'Purchased 10 strolls.',
		rules: [{ metric: 'purchasedStrollsCount', operator: 'gte', value: 10 }]
	},
	{
		code: 'FLAWLESS_RUN',
		icon: 'verified',
		title: 'Perfectionist',
		description: 'Completed an adventure without a single wrong answer.',
		rules: [{ metric: 'flawlessCompletions', operator: 'gte', value: 1 }]
	},
	{
		code: 'FLAWLESS_FIVE',
		icon: 'military_tech',
		title: 'Flawless Streak',
		description: 'Completed 5 adventures without a single wrong answer.',
		rules: [{ metric: 'flawlessCompletions', operator: 'gte', value: 5 }]
	},
	{
		code: 'SPEED_30MIN',
		icon: 'directions_run',
		title: 'Speed Walker',
		description: 'Finished an adventure in under 30 minutes.',
		rules: [{ metric: 'shortestCompletionSeconds', operator: 'lte', value: 1800 }]
	},
	{
		code: 'SPEED_15MIN',
		icon: 'bolt',
		title: 'Sprinter',
		description: 'Finished an adventure in under 15 minutes.',
		rules: [{ metric: 'shortestCompletionSeconds', operator: 'lte', value: 900 }]
	},
	{
		code: 'DISTANCE_20KM',
		icon: 'straighten',
		title: 'Marathoner',
		description: 'Walked a combined 20 km across completed adventures.',
		rules: [{ metric: 'totalDistanceKm', operator: 'gte', value: 20 }]
	},
	{
		code: 'DISTANCE_50KM',
		icon: 'flight_takeoff',
		title: 'Globetrotter',
		description: 'Walked a combined 50 km across completed adventures.',
		rules: [{ metric: 'totalDistanceKm', operator: 'gte', value: 50 }]
	},
	{
		code: 'NIGHT_OWL',
		icon: 'dark_mode',
		title: 'Night Owl',
		description: 'Completed an adventure between 10 PM and 5 AM.',
		rules: [{ metric: 'nightOwlCompletions', operator: 'gte', value: 1 }]
	},
	{
		code: 'EARLY_BIRD',
		icon: 'wb_twilight',
		title: 'Early Bird',
		description: 'Completed an adventure before 7 AM.',
		rules: [{ metric: 'earlyBirdCompletions', operator: 'gte', value: 1 }]
	},
	{
		code: 'WEEKEND_WANDERER',
		icon: 'weekend',
		title: 'Weekend Wanderer',
		description: 'Completed 3 adventures on weekends.',
		rules: [{ metric: 'weekendCompletions', operator: 'gte', value: 3 }]
	},
	{
		code: 'BUSY_DAY',
		icon: 'event_repeat',
		title: 'Busy Day',
		description: 'Completed 3 adventures in a single day.',
		rules: [{ metric: 'maxCompletionsInSingleDay', operator: 'gte', value: 3 }]
	},
	{
		code: 'CATEGORY_EXPLORER',
		icon: 'category',
		title: 'Category Explorer',
		description: 'Completed strolls in 3 different categories.',
		rules: [{ metric: 'distinctCategoriesCompleted', operator: 'gte', value: 3 }]
	},
	{
		code: 'CATEGORY_MASTER',
		icon: 'workspace_premium',
		title: 'Category Master',
		description: 'Completed strolls in 6 different categories.',
		rules: [{ metric: 'distinctCategoriesCompleted', operator: 'gte', value: 6 }]
	},
	{
		code: 'FIRST_STROLL_CREATED',
		icon: 'edit_road',
		title: 'Storyteller',
		description: 'Created your first stroll.',
		rules: [{ metric: 'createdStrollsCount', operator: 'gte', value: 1 }]
	},
	{
		code: 'FIVE_STROLLS_CREATED',
		icon: 'auto_stories',
		title: 'Prolific Creator',
		description: 'Created 5 strolls.',
		rules: [{ metric: 'createdStrollsCount', operator: 'gte', value: 5 }]
	},
	{
		code: 'FIRST_PUBLISHED',
		icon: 'publish',
		title: 'Published Author',
		description: 'Published your first stroll.',
		rules: [{ metric: 'publishedStrollsCount', operator: 'gte', value: 1 }]
	},
	{
		code: 'FIRST_REVIEW',
		icon: 'rate_review',
		title: 'Critic',
		description: 'Wrote your first review.',
		rules: [{ metric: 'reviewsCount', operator: 'gte', value: 1 }]
	},
	{
		code: 'TEN_REVIEWS',
		icon: 'reviews',
		title: 'Seasoned Reviewer',
		description: 'Wrote 10 reviews.',
		rules: [{ metric: 'reviewsCount', operator: 'gte', value: 10 }]
	},
	{
		code: 'RENAISSANCE_STROLLER',
		icon: 'diversity_3',
		title: 'Well Rounded',
		description: 'Created, completed, and reviewed a stroll.',
		rules: [
			{ metric: 'createdStrollsCount', operator: 'gte', value: 1 },
			{ metric: 'completedStrollsCount', operator: 'gte', value: 1 },
			{ metric: 'reviewsCount', operator: 'gte', value: 1 }
		]
	},
	{
		code: 'ACTIVE_ADVENTURER',
		icon: 'sync',
		title: 'Juggler',
		description: 'Had 3 strolls purchased or in progress at the same time.',
		rules: [{ metric: 'activeStrollsCount', operator: 'gte', value: 3 }]
	},
	{
		code: 'HISTORIAN',
		icon: 'castle',
		title: 'Historian',
		description: 'Completed a historical stroll.',
		rules: [{ metric: 'categoryCompleted', operator: 'eq', value: 'HISTORICAL' }]
	},
	{
		code: 'FOODIE',
		icon: 'restaurant',
		title: 'Foodie',
		description: 'Completed a food & drink stroll.',
		rules: [{ metric: 'categoryCompleted', operator: 'eq', value: 'GASTRO' }]
	},
	{
		code: 'ART_LOVER',
		icon: 'palette',
		title: 'Art Lover',
		description: 'Completed an art stroll.',
		rules: [{ metric: 'categoryCompleted', operator: 'eq', value: 'ART' }]
	},
	{
		code: 'ATHLETE',
		icon: 'sports_score',
		title: 'Athlete',
		description: 'Completed a sports stroll.',
		rules: [{ metric: 'categoryCompleted', operator: 'eq', value: 'SPORTS' }]
	},
	{
		code: 'PILGRIM',
		icon: 'church',
		title: 'Pilgrim',
		description: 'Completed a religious stroll.',
		rules: [{ metric: 'categoryCompleted', operator: 'eq', value: 'RELIGION' }]
	},
	{
		code: 'NATURE_LOVER',
		icon: 'park',
		title: 'Nature Lover',
		description: 'Completed a landscape stroll.',
		rules: [{ metric: 'categoryCompleted', operator: 'eq', value: 'LANDSCAPE' }]
	},
	{
		code: 'BADGE_COLLECTOR',
		icon: 'emoji_events',
		title: 'Badge Collector',
		description: 'Earned 10 badges.',
		rules: [{ metric: 'totalBadgesEarned', operator: 'gte', value: 10 }]
	}
];

// Static mock data used only by the /screens views (UI/UX demo, no backend calls).

export type TourCategory = 'Historical' | 'Mystery' | 'Cultural';
export type TourStatus = 'Published' | 'Draft';
export type UserTourStatus = 'Undiscovered' | 'In Progress' | 'Completed';

// Translation keys for the enum-like values above, keyed by their canonical (English) data value.
// Typed as Record<string, string> so template lookups (which report the row type as `any`) type-check cleanly.
export const CATEGORY_LABEL_KEYS: Record<string, string> = {
	All: 'SCREENS.CATEGORY_ALL',
	Historical: 'SCREENS.CATEGORY_HISTORICAL',
	Mystery: 'SCREENS.CATEGORY_MYSTERY',
	Cultural: 'SCREENS.CATEGORY_CULTURAL'
};

export const TOUR_STATUS_LABEL_KEYS: Record<string, string> = {
	Published: 'SCREENS.ADMIN_TOUR_LIST.STATUS_PUBLISHED',
	Draft: 'SCREENS.ADMIN_TOUR_LIST.STATUS_DRAFT'
};

export const USER_TOUR_STATUS_LABEL_KEYS: Record<string, string> = {
	Undiscovered: 'SCREENS.USER_DASHBOARD.STATUS_UNDISCOVERED',
	'In Progress': 'SCREENS.USER_DASHBOARD.STATUS_IN_PROGRESS',
	Completed: 'SCREENS.USER_DASHBOARD.STATUS_COMPLETED'
};

export interface TourStation {
	id: string;
	name: string;
	address: string;
	latitude: number;
	longitude: number;
}

export interface Tour {
	id: string;
	title: string;
	category: TourCategory;
	durationMinutes: number;
	price: number;
	distanceKm: number;
	description: string;
	coverImageUrl?: string;
	coverFallback: string;
	stations: TourStation[];
}

export interface AdminTourRow {
	id: string;
	name: string;
	stationsCount: number;
	category: TourCategory;
	price: number;
	status: TourStatus;
}

export interface UserTourRow {
	id: string;
	name: string;
	stationsCount: number;
	category: TourCategory;
	status: UserTourStatus;
}

export const MOCK_TOURS: Tour[] = [
	{
		id: 'fishermans-bastion-mystery',
		title: "Fisherman's Bastion Mystery",
		category: 'Mystery',
		durationMinutes: 90,
		price: 3500,
		distanceKm: 2.4,
		description:
			"Uncover the hidden legends of Buda Castle district. Follow cryptic riddles left by medieval guild members through the fairy-tale turrets of Fisherman's Bastion, into the shadows of Matthias Church, and beyond.",
		coverFallback: 'linear-gradient(135deg, #0891b2 0%, #155e75 60%, #0f172a 100%)',
		stations: [
			{ id: 's1', name: "Fisherman's Bastion", address: 'Szentháromság tér 2, Budapest', latitude: 47.5022, longitude: 19.0347 },
			{ id: 's2', name: 'Matthias Church', address: 'Szentháromság tér 2, Budapest', latitude: 47.5023, longitude: 19.0352 },
			{ id: 's3', name: 'The Mysterious Crest', address: 'Táncsics Mihály utca 7, Budapest', latitude: 47.5031, longitude: 19.0339 },
			{ id: 's4', name: 'Buda Castle Courtyard', address: 'Szent György tér, Budapest', latitude: 47.4967, longitude: 19.0397 },
			{ id: 's5', name: 'Sándor Palace Gate', address: 'Szent György tér 1, Budapest', latitude: 47.4969, longitude: 19.0389 },
			{ id: 's6', name: 'Vienna Gate Square', address: 'Bécsi kapu tér, Budapest', latitude: 47.5051, longitude: 19.0323 }
		]
	},
	{
		id: 'jewish-quarter-heritage',
		title: 'Jewish Quarter Heritage Walk',
		category: 'Historical',
		durationMinutes: 75,
		price: 2900,
		distanceKm: 1.8,
		description:
			'Walk through the cobbled streets of the historic Jewish Quarter, from the Dohány Street Synagogue to the vibrant ruin bars, tracing a century of resilience, culture and revival.',
		coverFallback: 'linear-gradient(135deg, #b45309 0%, #92400e 55%, #1c1917 100%)',
		stations: [
			{ id: 's1', name: 'Dohány Street Synagogue', address: 'Dohány utca 2, Budapest', latitude: 47.4952, longitude: 19.0598 },
			{ id: 's2', name: 'Holocaust Memorial Garden', address: 'Wesselényi utca 6, Budapest', latitude: 47.4954, longitude: 19.0601 },
			{ id: 's3', name: 'Rumbach Street Synagogue', address: 'Rumbach Sebestyén utca 11-13, Budapest', latitude: 47.4972, longitude: 19.0597 },
			{ id: 's4', name: 'Gozsdu Courtyard', address: 'Király utca 13, Budapest', latitude: 47.4977, longitude: 19.0605 },
			{ id: 's5', name: 'Szimpla Kert Ruin Bar', address: 'Kazinczy utca 14, Budapest', latitude: 47.4966, longitude: 19.0615 }
		]
	},
	{
		id: 'danube-legends',
		title: 'Danube Legends & Chain Bridge',
		category: 'Cultural',
		durationMinutes: 60,
		price: 2500,
		distanceKm: 3.1,
		description:
			'Stroll along the Danube promenade to discover the stories behind the Chain Bridge, the Shoes Memorial, and the grand facades of Pest, set against the backdrop of the Buda hills.',
		coverFallback: 'linear-gradient(135deg, #0e7490 0%, #164e63 55%, #082f49 100%)',
		stations: [
			{ id: 's1', name: 'Shoes on the Danube Bank', address: 'Id. Antall József rakpart, Budapest', latitude: 47.5017, longitude: 19.0453 },
			{ id: 's2', name: 'Széchenyi Chain Bridge', address: 'Széchenyi Lánchíd, Budapest', latitude: 47.4989, longitude: 19.0433 },
			{ id: 's3', name: 'Gresham Palace', address: 'Széchenyi István tér 5-6, Budapest', latitude: 47.5008, longitude: 19.0462 },
			{ id: 's4', name: 'Hungarian Parliament', address: 'Kossuth Lajos tér 1-3, Budapest', latitude: 47.5072, longitude: 19.0458 }
		]
	}
];

export const MOCK_ADMIN_TOURS: AdminTourRow[] = [
	{ id: 't1', name: "Fisherman's Bastion Mystery", stationsCount: 6, category: 'Mystery', price: 3500, status: 'Published' },
	{ id: 't2', name: 'Jewish Quarter Heritage Walk', stationsCount: 5, category: 'Historical', price: 2900, status: 'Published' },
	{ id: 't3', name: 'Danube Legends & Chain Bridge', stationsCount: 4, category: 'Cultural', price: 2500, status: 'Published' },
	{ id: 't4', name: 'Margaret Island Secrets', stationsCount: 7, category: 'Mystery', price: 3200, status: 'Draft' },
	{ id: 't5', name: 'Gellért Hill & Citadella', stationsCount: 5, category: 'Historical', price: 2700, status: 'Draft' },
	{ id: 't6', name: 'Great Market Hall Flavours', stationsCount: 3, category: 'Cultural', price: 1900, status: 'Published' }
];

export const MOCK_USER_TOURS: UserTourRow[] = [
	{ id: 'u1', name: "Fisherman's Bastion Mystery", stationsCount: 6, category: 'Mystery', status: 'In Progress' },
	{ id: 'u2', name: 'Jewish Quarter Heritage Walk', stationsCount: 5, category: 'Historical', status: 'Completed' },
	{ id: 'u3', name: 'Danube Legends & Chain Bridge', stationsCount: 4, category: 'Cultural', status: 'Completed' },
	{ id: 'u4', name: 'Margaret Island Secrets', stationsCount: 7, category: 'Mystery', status: 'Undiscovered' },
	{ id: 'u5', name: 'Great Market Hall Flavours', stationsCount: 3, category: 'Cultural', status: 'Undiscovered' }
];

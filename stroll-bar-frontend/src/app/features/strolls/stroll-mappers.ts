// Maps backend Stroll/Stage responses onto the richer Tour shape used by the /screens demo UI.
import { Stage, Stroll } from '../../core/api/models';
import { Tour, TourCategory, TourStation } from '../../core/models/screens.models';

const HERO_GRADIENTS = [
	'linear-gradient(135deg, #0891b2 0%, #155e75 60%, #0f172a 100%)',
	'linear-gradient(135deg, #b45309 0%, #92400e 55%, #1c1917 100%)',
	'linear-gradient(135deg, #0e7490 0%, #164e63 55%, #082f49 100%)'
];

const KNOWN_CATEGORIES: TourCategory[] = ['Historical', 'Mystery', 'Cultural'];

export function mapStrollToTour(stroll: Stroll, index = 0): Tour {
	const category = KNOWN_CATEGORIES.find((known) => stroll.labels.includes(known)) ?? 'Cultural';

	return {
		id: stroll.id,
		title: stroll.name,
		category,
		durationMinutes: stroll.stageCount * 15,
		price: 0,
		distanceKm: 0,
		description: stroll.description,
		heroGradient: HERO_GRADIENTS[index % HERO_GRADIENTS.length],
		stations: []
	};
}

export function mapStageToTourStation(stage: Stage): TourStation {
	return {
		id: stage.id,
		name: stage.name,
		address: stage.address ?? '',
		latitude: stage.latitude ?? 0,
		longitude: stage.longitude ?? 0
	};
}

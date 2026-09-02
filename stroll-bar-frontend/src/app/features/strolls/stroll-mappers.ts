// Maps backend Stroll/Stage responses onto the richer Stroll shape used by the /screens demo UI.
import { StrollSummary } from '../../core/api/models';
import { Stroll, StrollCategory } from '../../core/models/screens.models';

const KNOWN_CATEGORIES: StrollCategory[] = ['Historical', 'Mystery', 'Cultural'];

export function mapStrollToStroll(stroll: StrollSummary): Stroll {
	const category = KNOWN_CATEGORIES.find((known) => stroll.labels.includes(known)) ?? 'Cultural';

	return {
		id: stroll.id,
		title: stroll.name,
		category,
		durationMinutes: stroll.stageCount * 15,
		price: 0,
		distanceKm: 0,
		description: stroll.description,
		publicityFlag: stroll.publicityFlag,
		stationsCount: stroll.stageCount,
		coverImageUrl: stroll.mediaUrls?.imageUrls?.[0],
		coverFallback: createCoverFallback(stroll.id),
		stations: []
	};
}

function createCoverFallback(strollId: string): string {
	let hash = 2166136261;

	for (let index = 0; index < strollId.length; index += 1) {
		hash ^= strollId.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	const unsignedHash = hash >>> 0;
	const primaryHue = unsignedHash % 720;
	const secondaryHue = (primaryHue + 30 + ((unsignedHash >>> 8) % 61)) % 360;
	const deepHue = (secondaryHue + 15 + ((unsignedHash >>> 16) % 31)) % 360;
	const angle = 115 + ((unsignedHash >>> 24) % 51);

	return `linear-gradient(${angle}deg, hsl(${primaryHue} 58% 42%) 0%, hsl(${secondaryHue} 52% 28%) 62%, hsl(${deepHue} 42% 16%) 100%)`;
}

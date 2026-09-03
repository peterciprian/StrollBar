import { StageEntity } from '../stages/entities/stage.entity';

export function calculateRouteLengthKm(stages: Pick<StageEntity, 'latitude' | 'longitude'>[]): number {
	return stages.slice(1).reduce((total, stage, index) => total + distanceBetween(stages[index], stage), 0);
}

function distanceBetween(first: Pick<StageEntity, 'latitude' | 'longitude'>, second: Pick<StageEntity, 'latitude' | 'longitude'>): number {
	if (first.latitude == null || first.longitude == null || second.latitude == null || second.longitude == null) return 0;
	const toRadians = (value: number) => (value * Math.PI) / 180;
	const latitudeDelta = toRadians(second.latitude - first.latitude);
	const longitudeDelta = toRadians(second.longitude - first.longitude);
	const a =
		Math.sin(latitudeDelta / 2) ** 2 +
		Math.cos(toRadians(first.latitude)) * Math.cos(toRadians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
	return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

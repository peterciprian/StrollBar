import { BadRequestException } from '@nestjs/common';

export interface StrollReadinessIssue {
	field: string;
	code:
		| 'STROLL_NAME_REQUIRED'
		| 'STROLL_DESCRIPTION_REQUIRED'
		| 'STROLL_STAGE_REQUIRED'
		| 'STAGE_NAME_REQUIRED'
		| 'STAGE_DESCRIPTION_REQUIRED'
		| 'STAGE_LOCATION_REQUIRED';
}

interface ReadinessStage {
	name?: string | null;
	description?: string | null;
	address?: string | null;
	latitude?: number | null;
	longitude?: number | null;
}

export function getStrollReadinessIssues(
	name: string | null | undefined,
	description: string | null | undefined,
	stages: readonly ReadinessStage[]
): StrollReadinessIssue[] {
	const issues: StrollReadinessIssue[] = [];

	if (!name?.trim()) issues.push({ field: 'name', code: 'STROLL_NAME_REQUIRED' });
	if (!description?.trim()) issues.push({ field: 'description', code: 'STROLL_DESCRIPTION_REQUIRED' });
	if (!stages.length) issues.push({ field: 'stages', code: 'STROLL_STAGE_REQUIRED' });

	stages.forEach((stage, index) => {
		if (!stage.name?.trim()) issues.push({ field: `stages.${index}.name`, code: 'STAGE_NAME_REQUIRED' });
		if (!stage.description?.trim()) issues.push({ field: `stages.${index}.description`, code: 'STAGE_DESCRIPTION_REQUIRED' });

		const hasAddress = !!stage.address?.trim();
		const hasValidCoordinates =
			typeof stage.latitude === 'number' &&
			Number.isFinite(stage.latitude) &&
			stage.latitude >= -90 &&
			stage.latitude <= 90 &&
			typeof stage.longitude === 'number' &&
			Number.isFinite(stage.longitude) &&
			stage.longitude >= -180 &&
			stage.longitude <= 180;
		if (!hasAddress && !hasValidCoordinates) issues.push({ field: `stages.${index}.location`, code: 'STAGE_LOCATION_REQUIRED' });
	});

	return issues;
}

export function throwIfStrollNotReady(
	name: string | null | undefined,
	description: string | null | undefined,
	stages: readonly ReadinessStage[]
): void {
	const errors = getStrollReadinessIssues(name, description, stages);
	if (!errors.length) return;

	throw new BadRequestException({
		code: 'STROLL_NOT_READY',
		message: 'The stroll is not ready to publish.',
		errors
	});
}

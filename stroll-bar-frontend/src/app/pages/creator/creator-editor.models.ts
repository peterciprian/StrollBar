import { StrollActiveStatus, StrollPublicityFlag } from '../../core/api/models';

export interface EditableStroll {
	name: string;
	description: string;
	labelsText: string;
	status: StrollActiveStatus;
	publicity: StrollPublicityFlag;
	imageUrls: string[];
	videoUrls: string[];
}

export interface EditableStage {
	id: string;
	isNew: boolean;
	orderIndex: number;
	name: string;
	address: string;
	latitude: number;
	longitude: number;
	description: string;
	riddleAnswer: string;
	imageUrls: string[];
	videoUrls: string[];
}

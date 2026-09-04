import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { AdventureResultEntity } from './entities/adventure-result.entity';

export interface RecordAdventureResultParams {
	userId: string;
	strollId: string;
	adventureId: string;
	completedStageCount: number;
	elapsedSeconds: number;
	routeLengthKm: number;
	completedAt: Date;
}

@Injectable()
export class AdventureResultsService {
	constructor(
		@InjectRepository(AdventureResultEntity)
		private readonly adventureResultsRepository: Repository<AdventureResultEntity>,
		@InjectRepository(StrollEntity)
		private readonly strollsRepository: Repository<StrollEntity>
	) {}

	// Idempotent: an adventure can only ever produce one result row.
	async recordCompletion(params: RecordAdventureResultParams): Promise<AdventureResultEntity> {
		const existing = await this.adventureResultsRepository.findOne({ where: { adventureId: params.adventureId } });

		if (existing) {
			return existing;
		}

		const result = this.adventureResultsRepository.create(params);
		return this.adventureResultsRepository.save(result);
	}

	async findAllForUser(userId: string): Promise<{ result: AdventureResultEntity; stroll: StrollEntity | null }[]> {
		const results = await this.adventureResultsRepository.find({ where: { userId }, order: { completedAt: 'DESC' } });

		if (!results.length) {
			return [];
		}

		const strollIds = [...new Set(results.map((result) => result.strollId))];
		const strolls = await this.strollsRepository.find({ where: { id: In(strollIds) } });
		const strollsById = new Map(strolls.map((stroll) => [stroll.id, stroll]));

		return results.map((result) => ({ result, stroll: strollsById.get(result.strollId) ?? null }));
	}
}

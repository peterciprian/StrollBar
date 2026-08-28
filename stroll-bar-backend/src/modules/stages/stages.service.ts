import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateStageDto } from './dto/create-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { StageEntity } from './entities/stage.entity';

@Injectable()
export class StagesService {
	constructor(
		@InjectRepository(StageEntity)
		private readonly stagesRepository: Repository<StageEntity>,
		@InjectRepository(StrollEntity)
		private readonly strollsRepository: Repository<StrollEntity>
	) {}

	async list(strollId: string) {
		return this.stagesRepository.find({
			where: { strollId },
			order: { orderIndex: 'ASC' }
		});
	}

	async create(strollId: string, dto: CreateStageDto, currentUserId: string) {
		const stroll = await this.getOwnedStrollOrThrow(strollId, currentUserId);

		const stage = this.stagesRepository.create({
			strollId,
			orderIndex: dto.orderIndex,
			name: dto.name,
			description: dto.description,
			notes: dto.notes ?? null,
			imageUrls: dto.imageUrls ?? [],
			videoUrls: dto.videoUrls ?? [],
			address: dto.address ?? null,
			latitude: dto.latitude ?? null,
			longitude: dto.longitude ?? null,
			riddleAnswer: dto.riddleAnswer?.trim().toLowerCase() ?? null
		});

		const savedStage = await this.stagesRepository.save(stage);
		stroll.stageCount = await this.stagesRepository.count({ where: { strollId } });
		await this.strollsRepository.save(stroll);

		return savedStage;
	}

	async reorder(strollId: string, dto: ReorderStagesDto, currentUserId: string) {
		await this.getOwnedStrollOrThrow(strollId, currentUserId);
		const stages = await this.stagesRepository.find({ where: { strollId } });
		const stagesById = new Map(stages.map((stage) => [stage.id, stage]));

		for (const item of dto.items) {
			const stage = stagesById.get(item.stageId);

			if (!stage) {
				throw new NotFoundException(`Stage ${item.stageId} was not found in stroll ${strollId}.`);
			}

			stage.orderIndex = item.orderIndex;
		}

		await this.stagesRepository.save([...stagesById.values()]);

		return {
			strollId,
			reordered: dto.items.length
		};
	}

	async update(strollId: string, stageId: string, dto: UpdateStageDto, currentUserId: string) {
		await this.getOwnedStrollOrThrow(strollId, currentUserId);
		const stage = await this.stagesRepository.findOne({ where: { id: stageId, strollId } });

		if (!stage) {
			throw new NotFoundException(`Stage ${stageId} was not found in stroll ${strollId}.`);
		}

		if (dto.orderIndex !== undefined) stage.orderIndex = dto.orderIndex;
		if (dto.name !== undefined) stage.name = dto.name;
		if (dto.description !== undefined) stage.description = dto.description;
		if (dto.notes !== undefined) stage.notes = dto.notes;
		if (dto.imageUrls !== undefined) stage.imageUrls = dto.imageUrls;
		if (dto.videoUrls !== undefined) stage.videoUrls = dto.videoUrls;
		if (dto.address !== undefined) stage.address = dto.address;
		if (dto.latitude !== undefined) stage.latitude = dto.latitude;
		if (dto.longitude !== undefined) stage.longitude = dto.longitude;
		if (dto.riddleAnswer !== undefined) stage.riddleAnswer = dto.riddleAnswer.trim().toLowerCase();

		return this.stagesRepository.save(stage);
	}

	async remove(strollId: string, stageId: string, currentUserId: string) {
		const stroll = await this.getOwnedStrollOrThrow(strollId, currentUserId);
		const stage = await this.stagesRepository.findOne({ where: { id: stageId, strollId } });

		if (!stage) {
			throw new NotFoundException(`Stage ${stageId} was not found in stroll ${strollId}.`);
		}

		await this.stagesRepository.remove(stage);
		stroll.stageCount = await this.stagesRepository.count({ where: { strollId } });
		await this.strollsRepository.save(stroll);

		return { id: stageId, deleted: true };
	}

	private async getOwnedStrollOrThrow(strollId: string, currentUserId: string): Promise<StrollEntity> {
		const stroll = await this.strollsRepository.findOne({ where: { id: strollId } });

		if (!stroll) {
			throw new NotFoundException(`Stroll ${strollId} was not found.`);
		}

		if (stroll.authorId !== currentUserId) {
			throw new ForbiddenException('You are not allowed to modify stages in this stroll.');
		}

		return stroll;
	}
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { AchievementEntity } from './entities/achievement.entity';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(AchievementEntity)
    private readonly achievementsRepository: Repository<AchievementEntity>,
  ) {}

  async create(dto: CreateAchievementDto, userId: string): Promise<AchievementEntity> {
    const achievement = this.achievementsRepository.create({
      userId,
      strollId: dto.strollId,
      score: dto.score ?? 0,
      timeSeconds: dto.timeSeconds ?? 0,
      hintsUsed: dto.hintsUsed ?? 0,
      completed: dto.completed ?? false,
      completedAt: dto.completed ? new Date() : null,
    });
    return this.achievementsRepository.save(achievement);
  }

  async findAllForUser(userId: string): Promise<AchievementEntity[]> {
    return this.achievementsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<AchievementEntity> {
    const achievement = await this.achievementsRepository.findOne({ where: { id, userId } });
    if (!achievement) {
      throw new NotFoundException(`Achievement ${id} was not found.`);
    }
    return achievement;
  }
}

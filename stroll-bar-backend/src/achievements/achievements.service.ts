import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { Achievement, IAchievement } from './entities/achievement.entity';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectModel(Achievement.name)
    private readonly achievementModel: Model<Achievement>,
  ) { }

  public async findAll(
    paginationQuery: PaginationQueryDto,
  ): Promise<Achievement[]> {
    const { limit, offset } = paginationQuery;

    return await this.achievementModel.find().skip(offset).limit(limit).exec();
  }

  public async findOne(achievementId: string): Promise<Achievement> {
    const achievement = await this.achievementModel
      .findById({ _id: achievementId })
      .exec();

    if (!achievement) {
      throw new NotFoundException(`Achievement #${achievementId} not found`);
    }

    return achievement;
  }

  public async create(
    createAchievementDto: CreateAchievementDto,
  ): Promise<IAchievement> {
    const newAchievement = await new this.achievementModel(createAchievementDto);
    return newAchievement.save();
  }

  public async update(
    achievementId: string,
    updateAchievementDto: UpdateAchievementDto,
  ): Promise<IAchievement> {
    const existingAchievement = await this.achievementModel.findByIdAndUpdate(
      { _id: achievementId },
      updateAchievementDto,
    );

    if (!existingAchievement) {
      throw new NotFoundException(`Achievement #${achievementId} not found`);
    }

    return existingAchievement;
  }

  public async remove(achievementId: string): Promise<any> {
    const deletedAchievement = await this.achievementModel.findByIdAndRemove(
      achievementId,
    );
    return deletedAchievement;
  }
}

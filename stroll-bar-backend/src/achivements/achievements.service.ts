import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { CreateAchivementDto } from './dto/create-achivement.dto';
import { UpdateAchivementDto } from './dto/update-achivement.dto';
import { Achivement, IAchivement } from './entities/achivement.entity';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectModel(Achivement.name)
    private readonly achivementModel: Model<Achivement>,
  ) {}

  public async findAll(
    paginationQuery: PaginationQueryDto,
  ): Promise<Achivement[]> {
    const { limit, offset } = paginationQuery;

    return await this.achivementModel.find().skip(offset).limit(limit).exec();
  }

  public async findOne(achivementId: string): Promise<Achivement> {
    const achivement = await this.achivementModel
      .findById({ _id: achivementId })
      .exec();

    if (!achivement) {
      throw new NotFoundException(`Achivement #${achivementId} not found`);
    }

    return achivement;
  }

  public async create(
    createAchivementDto: CreateAchivementDto,
  ): Promise<IAchivement> {
    const newAchivement = await new this.achivementModel(createAchivementDto);
    return newAchivement.save();
  }

  public async update(
    achivementId: string,
    updateAchivementDto: UpdateAchivementDto,
  ): Promise<IAchivement> {
    const existingAchivement = await this.achivementModel.findByIdAndUpdate(
      { _id: achivementId },
      updateAchivementDto,
    );

    if (!existingAchivement) {
      throw new NotFoundException(`Achivement #${achivementId} not found`);
    }

    return existingAchivement;
  }

  public async remove(achivementId: string): Promise<any> {
    const deletedAchivement = await this.achivementModel.findByIdAndRemove(
      achivementId,
    );
    return deletedAchivement;
  }
}

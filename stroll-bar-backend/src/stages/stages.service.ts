import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { IStage, Stage } from './entities/stage.entity';

@Injectable()
export class StagesService {
  constructor(
    @InjectModel(Stage.name) private readonly stageModel: Model<Stage>,
  ) {}

  public async findAll(paginationQuery: PaginationQueryDto): Promise<Stage[]> {
    const { limit, offset } = paginationQuery;

    return await this.stageModel.find().skip(offset).limit(limit).exec();
  }

  public async findOne(stageId: string): Promise<Stage> {
    const stage = await this.stageModel.findById({ _id: stageId }).exec();

    if (!stage) {
      throw new NotFoundException(`Stage #${stageId} not found`);
    }

    return stage;
  }

  public async create(createStageDto: CreateStageDto): Promise<IStage> {
    const newStage = await new this.stageModel(createStageDto);
    return newStage.save();
  }

  public async update(
    stageId: string,
    updateStageDto: UpdateStageDto,
  ): Promise<IStage> {
    const existingStage = await this.stageModel.findByIdAndUpdate(
      { _id: stageId },
      updateStageDto,
    );

    if (!existingStage) {
      throw new NotFoundException(`Stage #${stageId} not found`);
    }

    return existingStage;
  }

  public async remove(stageId: string): Promise<any> {
    const deletedStage = await this.stageModel.findByIdAndRemove(stageId);
    return deletedStage;
  }
}

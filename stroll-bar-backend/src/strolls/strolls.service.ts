import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { CreateStrollDto } from './dto/create-stroll.dto';
import { UpdateStrollDto } from './dto/update-stroll.dto';
import { IStroll, Stroll } from './entities/stroll.entity';

@Injectable()
export class StrollsService {
  constructor(
    @InjectModel(Stroll.name) private readonly strollModel: Model<Stroll>,
  ) {}

  public async findAll(paginationQuery: PaginationQueryDto): Promise<Stroll[]> {
    const { limit, offset } = paginationQuery;

    return await this.strollModel.find().skip(offset).limit(limit).exec();
  }

  public async findOne(strollId: string): Promise<Stroll> {
    const stroll = await this.strollModel.findById({ _id: strollId }).exec();

    if (!stroll) {
      throw new NotFoundException(`Stroll #${strollId} not found`);
    }

    return stroll;
  }

  public async create(createStrollDto: CreateStrollDto): Promise<IStroll> {
    const newStroll = await new this.strollModel(createStrollDto);
    return newStroll.save();
  }

  public async update(
    strollId: string,
    updateStrollDto: UpdateStrollDto,
  ): Promise<IStroll> {
    const existingStroll = await this.strollModel.findByIdAndUpdate(
      { _id: strollId },
      updateStrollDto,
    );

    if (!existingStroll) {
      throw new NotFoundException(`Stroll #${strollId} not found`);
    }

    return existingStroll;
  }

  public async remove(strollId: string): Promise<any> {
    const deletedStroll = await this.strollModel.findByIdAndRemove(strollId);
    return deletedStroll;
  }
}

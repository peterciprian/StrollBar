import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { CreateStrollDto } from './dto/create-stroll.dto';
import { UpdateStrollDto } from './dto/update-stroll.dto';
import { Stroll } from './entities/stroll.entity';

@Injectable()
export class StrollsService {
  constructor(
    @InjectModel(Stroll.name) private readonly strollModel: Model<Stroll>,
  ) {}

  public async findAll(paginationQuery: PaginationQueryDto): Promise<Stroll[]> {
    const { limit, offset } = paginationQuery;

    return await this.strollModel.find().skip(offset).limit(limit).exec();
  }

  public async findOne(customerId: string): Promise<Stroll> {
    const customer = await this.strollModel
      .findById({ _id: customerId })
      .exec();

    if (!customer) {
      throw new NotFoundException(`Stroll #${customerId} not found`);
    }

    return customer;
  }

  public async create(createCustomerDto: CreateStrollDto): Promise<IStroll> {
    const newCustomer = await new this.strollModel(createCustomerDto);
    return newCustomer.save();
  }

  public async update(
    customerId: string,
    updateCustomerDto: UpdateStrollDto,
  ): Promise<IStroll> {
    const existingCustomer = await this.strollModel.findByIdAndUpdate(
      { _id: customerId },
      updateCustomerDto,
    );

    if (!existingCustomer) {
      throw new NotFoundException(`Stroll #${customerId} not found`);
    }

    return existingCustomer;
  }

  public async remove(customerId: string): Promise<any> {
    const deletedCustomer = await this.strollModel.findByIdAndRemove(
      customerId,
    );
    return deletedCustomer;
  }
}

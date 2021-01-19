import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, IUser } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  public async findAll(paginationQuery: PaginationQueryDto): Promise<User[]> {
    const { limit, offset } = paginationQuery;

    return await this.userModel.find().skip(offset).limit(limit).exec();
  }

  public async findOne(userId: string): Promise<User> {
    const user = await this.userModel.findById({ _id: userId }).exec();

    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    return user;
  }

  public async create(createUserDto: CreateUserDto): Promise<IUser> {
    const newUser = await new this.userModel(createUserDto);
    return newUser.save();
  }

  public async update(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<IUser> {
    const existingUser = await this.userModel.findByIdAndUpdate(
      { _id: userId },
      updateUserDto,
    );

    if (!existingUser) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    return existingUser;
  }

  public async remove(userId: string): Promise<any> {
    const deletedUser = await this.userModel.findByIdAndRemove(userId);
    return deletedUser;
  }
}

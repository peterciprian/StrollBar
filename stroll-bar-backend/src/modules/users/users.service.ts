import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdventureProgressStatus, AdventureEntity } from '../adventures/entities/adventure.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from '../strolls/entities/stroll.entity';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(StrollEntity)
    private readonly strollsRepository: Repository<StrollEntity>,
    @InjectRepository(AdventureEntity)
    private readonly adventuresRepository: Repository<AdventureEntity>,
  ) {}

  async getPublicProfile(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User ${userId} was not found.`);
    }

    const publishedStrolls = await this.strollsRepository.find({
      where: {
        authorId: userId,
        activeStatus: StrollActiveStatus.PUBLISHED,
        publicityFlag: StrollPublicityFlag.PUBLIC,
      },
      select: { id: true },
    });

    const strollIds = publishedStrolls.map((stroll) => stroll.id);
    const unlockCount = strollIds.length
      ? await this.adventuresRepository.count({ where: { strollId: In(strollIds) } })
      : 0;
    const completionCount = strollIds.length
      ? await this.adventuresRepository.count({
          where: {
            strollId: In(strollIds),
            progressStatus: AdventureProgressStatus.COMPLETED,
          },
        })
      : 0;

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profileImageUrl: user.profileImageUrl ?? null,
      },
      stats: {
        publishedStrolls: publishedStrolls.length,
        unlockCount,
        completionCount,
      },
    };
  }
}

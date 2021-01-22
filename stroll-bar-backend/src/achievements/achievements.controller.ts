import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  HttpStatus,
  NotFoundException,
  Query,
  Res,
} from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Controller('api/achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) { }

  @Get()
  public async getAllAchievement(
    @Res() res,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const achievements = await this.achievementsService.findAll(paginationQuery);
    return res.status(HttpStatus.OK).json(achievements);
  }

  @Get('/:id')
  public async getAchievement(@Res() res, @Param('id') achievementId: string) {
    const achievement = await this.achievementsService.findOne(achievementId);
    if (!achievement) {
      throw new NotFoundException('Achievement does not exist!');
    }
    return res.status(HttpStatus.OK).json(achievement);
  }

  @Post()
  public async addAchievement(
    @Res() res,
    @Body() createAchievementDto: CreateAchievementDto,
  ) {
    try {
      const achievement = await this.achievementsService.create(
        createAchievementDto,
      );
      return res.status(HttpStatus.OK).json({
        message: 'Achievement has been created successfully',
        achievement,
      });
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Error: Achievement not created!',
        status: 400,
      });
    }
  }

  @Put('/:id')
  public async updateAchievement(
    @Res() res,
    @Param('id') achievementId: string,
    @Body() updateAchievementDto: UpdateAchievementDto,
  ) {
    try {
      const achievement = await this.achievementsService.update(
        achievementId,
        updateAchievementDto,
      );
      if (!achievement) {
        throw new NotFoundException('Achievement does not exist!');
      }
      return res.status(HttpStatus.OK).json({
        message: 'Achievement has been successfully updated',
        achievement,
      });
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Error: Achievement not updated!',
        status: 400,
      });
    }
  }

  @Delete('/:id')
  public async deleteAchievement(@Res() res, @Param('id') achievementId: string) {
    if (!achievementId) {
      throw new NotFoundException('Achievement ID does not exist');
    }

    const achievement = await this.achievementsService.remove(achievementId);

    if (!achievement) {
      throw new NotFoundException('Achievement does not exist');
    }

    return res.status(HttpStatus.OK).json({
      message: 'Achievement has been deleted',
      achievement,
    });
  }
}

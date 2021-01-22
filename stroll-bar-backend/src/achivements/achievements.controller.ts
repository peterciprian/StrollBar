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
import { CreateAchivementDto } from './dto/create-achivement.dto';
import { UpdateAchivementDto } from './dto/update-achivement.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Controller('api/achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  public async getAllAchivement(
    @Res() res,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const achievements = await this.achievementsService.findAll(
      paginationQuery,
    );
    return res.status(HttpStatus.OK).json(achievements);
  }

  @Get('/:id')
  public async getAchivement(@Res() res, @Param('id') achivementId: string) {
    const achivement = await this.achievementsService.findOne(achivementId);
    if (!achivement) {
      throw new NotFoundException('Achivement does not exist!');
    }
    return res.status(HttpStatus.OK).json(achivement);
  }

  @Post()
  public async addAchivement(
    @Res() res,
    @Body() createAchivementDto: CreateAchivementDto,
  ) {
    try {
      const achivement = await this.achievementsService.create(
        createAchivementDto,
      );
      return res.status(HttpStatus.OK).json({
        message: 'Achivement has been created successfully',
        achivement,
      });
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Error: Achivement not created!',
        status: 400,
      });
    }
  }

  @Put('/:id')
  public async updateAchivement(
    @Res() res,
    @Param('id') achivementId: string,
    @Body() updateAchivementDto: UpdateAchivementDto,
  ) {
    try {
      const achivement = await this.achievementsService.update(
        achivementId,
        updateAchivementDto,
      );
      if (!achivement) {
        throw new NotFoundException('Achivement does not exist!');
      }
      return res.status(HttpStatus.OK).json({
        message: 'Achivement has been successfully updated',
        achivement,
      });
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Error: Achivement not updated!',
        status: 400,
      });
    }
  }

  @Delete('/:id')
  public async deleteAchivement(@Res() res, @Param('id') achivementId: string) {
    if (!achivementId) {
      throw new NotFoundException('Achivement ID does not exist');
    }

    const achivement = await this.achievementsService.remove(achivementId);

    if (!achivement) {
      throw new NotFoundException('Achivement does not exist');
    }

    return res.status(HttpStatus.OK).json({
      message: 'Achivement has been deleted',
      achivement,
    });
  }
}

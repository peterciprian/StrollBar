import {
  Controller,
  Get,
  Res,
  HttpStatus,
  Post,
  Body,
  Put,
  NotFoundException,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { StagesService } from './stages.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Controller('api/stages')
export class StagesController {
  constructor(private readonly strollsService: StagesService) {}

  @Get()
  public async getAllStage(
    @Res() res,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const stages = await this.strollsService.findAll(paginationQuery);
    return res.status(HttpStatus.OK).json(stages);
  }

  @Get('/:id')
  public async getStage(@Res() res, @Param('id') stageId: string) {
    const stage = await this.strollsService.findOne(stageId);
    if (!stage) {
      throw new NotFoundException('Stage does not exist!');
    }
    return res.status(HttpStatus.OK).json(stage);
  }

  @Post()
  public async addStage(@Res() res, @Body() createStageDto: CreateStageDto) {
    try {
      const stage = await this.strollsService.create(createStageDto);
      return res.status(HttpStatus.OK).json({
        message: 'Stage has been created successfully',
        stage,
      });
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Error: Stage not created!',
        status: 400,
      });
    }
  }

  @Put('/:id')
  public async updateStage(
    @Res() res,
    @Param('id') stageId: string,
    @Body() updateStageDto: UpdateStageDto,
  ) {
    try {
      const stage = await this.strollsService.update(stageId, updateStageDto);
      if (!stage) {
        throw new NotFoundException('Stage does not exist!');
      }
      return res.status(HttpStatus.OK).json({
        message: 'Stage has been successfully updated',
        stage,
      });
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Error: Stage not updated!',
        status: 400,
      });
    }
  }

  @Delete('/:id')
  public async deleteStage(@Res() res, @Param('id') stageId: string) {
    if (!stageId) {
      throw new NotFoundException('Stage ID does not exist');
    }

    const stage = await this.strollsService.remove(stageId);

    if (!stage) {
      throw new NotFoundException('Stage does not exist');
    }

    return res.status(HttpStatus.OK).json({
      message: 'Stage has been deleted',
      stage,
    });
  }
}

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
import { StrollsService } from './strolls.service';
import { CreateStrollDto } from './dto/create-stroll.dto';
import { UpdateStrollDto } from './dto/update-stroll.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Controller('api/strolls')
export class StrollsController {
  constructor(private readonly strollsService: StrollsService) {}

  @Get()
  public async getAllStroll(
    @Res() res,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const strolls = await this.strollsService.findAll(paginationQuery);
    return res.status(HttpStatus.OK).json(strolls);
  }

  @Get('/:id')
  public async getStroll(@Res() res, @Param('id') strollId: string) {
    const stroll = await this.strollsService.findOne(strollId);
    if (!stroll) {
      throw new NotFoundException('Stroll does not exist!');
    }
    return res.status(HttpStatus.OK).json(stroll);
  }

  @Post()
  public async addStroll(@Res() res, @Body() createStrollDto: CreateStrollDto) {
    try {
      const stroll = await this.strollsService.create(createStrollDto);
      return res.status(HttpStatus.OK).json({
        message: 'Stroll has been created successfully',
        stroll,
      });
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Error: Stroll not created!',
        status: 400,
      });
    }
  }

  @Put('/:id')
  public async updateStroll(
    @Res() res,
    @Param('id') strollId: string,
    @Body() updateStrollDto: UpdateStrollDto,
  ) {
    try {
      const stroll = await this.strollsService.update(
        strollId,
        updateStrollDto,
      );
      if (!stroll) {
        throw new NotFoundException('Stroll does not exist!');
      }
      return res.status(HttpStatus.OK).json({
        message: 'Stroll has been successfully updated',
        stroll,
      });
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Error: Stroll not updated!',
        status: 400,
      });
    }
  }

  @Delete('/:id')
  public async deleteStroll(@Res() res, @Param('id') strollId: string) {
    if (!strollId) {
      throw new NotFoundException('Stroll ID does not exist');
    }

    const stroll = await this.strollsService.remove(strollId);

    if (!stroll) {
      throw new NotFoundException('Stroll does not exist');
    }

    return res.status(HttpStatus.OK).json({
      message: 'Stroll has been deleted',
      stroll,
    });
  }
}

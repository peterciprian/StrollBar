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
  public async getAllCustomer(
    @Res() res,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const customers = await this.strollsService.findAll(paginationQuery);
    return res.status(HttpStatus.OK).json(customers);
  }

  @Get('/:id')
  public async getCustomer(@Res() res, @Param('id') customerId: string) {
    const customer = await this.strollsService.findOne(customerId);
    if (!customer) {
      throw new NotFoundException('Customer does not exist!');
    }
    return res.status(HttpStatus.OK).json(customer);
  }

  @Post()
  public async addCustomer(
    @Res() res,
    @Body() createCustomerDto: CreateStrollDto,
  ) {
    try {
      const customer = await this.strollsService.create(createCustomerDto);
      return res.status(HttpStatus.OK).json({
        message: 'Customer has been created successfully',
        customer,
      });
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Error: Customer not created!',
        status: 400,
      });
    }
  }

  @Put('/:id')
  public async updateCustomer(
    @Res() res,
    @Param('id') customerId: string,
    @Body() updateCustomerDto: UpdateStrollDto,
  ) {
    try {
      const customer = await this.strollsService.update(
        customerId,
        updateCustomerDto,
      );
      if (!customer) {
        throw new NotFoundException('Customer does not exist!');
      }
      return res.status(HttpStatus.OK).json({
        message: 'Customer has been successfully updated',
        customer,
      });
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Error: Customer not updated!',
        status: 400,
      });
    }
  }

  @Delete('/:id')
  public async deleteCustomer(@Res() res, @Param('id') customerId: string) {
    if (!customerId) {
      throw new NotFoundException('Customer ID does not exist');
    }

    const customer = await this.strollsService.remove(customerId);

    if (!customer) {
      throw new NotFoundException('Customer does not exist');
    }

    return res.status(HttpStatus.OK).json({
      message: 'Customer has been deleted',
      customer,
    });
  }
}

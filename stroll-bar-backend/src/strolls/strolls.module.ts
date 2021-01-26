import { Module } from '@nestjs/common';
import { StrollsService } from './strolls.service';
import { StrollsController } from './strolls.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Stroll, StrollSchema } from './entities/stroll.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Stroll.name, schema: StrollSchema }]),
  ],
  controllers: [StrollsController],
  providers: [StrollsService],
  exports: [StrollsService],
})
export class StrollsModule { }

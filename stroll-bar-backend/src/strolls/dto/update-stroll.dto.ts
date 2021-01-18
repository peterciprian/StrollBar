import { PartialType } from '@nestjs/mapped-types';
import { CreateStrollDto } from './create-stroll.dto';

export class UpdateStrollDto extends PartialType(CreateStrollDto) {}

import { ApiProperty } from '@nestjs/swagger';
import { IsISO4217CurrencyCode, IsNumber, IsPositive, IsString, MaxLength } from 'class-validator';

export class StrollPriceDto {
	@ApiProperty({ example: 3500 })
	@IsNumber({ maxDecimalPlaces: 2 })
	@IsPositive()
	amount!: number;

	@ApiProperty({ example: 'HUF' })
	@IsString()
	@MaxLength(3)
	@IsISO4217CurrencyCode()
	currency!: string;
}

import { ApiProperty } from '@nestjs/swagger';

class HealthDependencyDto {
  @ApiProperty({ example: 'up' })
  status!: 'up' | 'down';

  @ApiProperty({ example: 'postgres' })
  provider!: string;

  @ApiProperty({ example: 'SELECT 1' })
  detail!: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok' | 'degraded';

  @ApiProperty({ type: HealthDependencyDto })
  database!: HealthDependencyDto;

  @ApiProperty({ type: HealthDependencyDto })
  storage!: HealthDependencyDto;
}

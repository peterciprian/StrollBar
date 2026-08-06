import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from './common/dto/error-response.dto';
import { HealthResponseDto } from './common/dto/health-response.dto';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Check PostgreSQL and object storage connectivity' })
  @ApiOkResponse({ type: HealthResponseDto, description: 'All critical dependencies are reachable.' })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto, description: 'One or more dependencies are unavailable.' })
  @Get('health')
  health() {
    return this.appService.health();
  }

  @ApiOperation({ summary: 'Check PostgreSQL connectivity only' })
  @ApiOkResponse({ description: 'The database connection is healthy.' })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto, description: 'The database connection is unavailable.' })
  @Get('health/db')
  databaseHealth() {
    return this.appService.databaseHealth();
  }

  @ApiOperation({ summary: 'Check object storage connectivity only' })
  @ApiOkResponse({ description: 'The storage connection is healthy.' })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto, description: 'The storage connection is unavailable.' })
  @Get('health/storage')
  storageHealth() {
    return this.appService.storageHealth();
  }
}

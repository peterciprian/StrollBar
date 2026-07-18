import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthResponseDto } from './common/dto/health-response.dto';
import { MediaService } from './modules/media/media.service';

@Injectable()
export class AppService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly mediaService: MediaService,
  ) {}

  async health(): Promise<HealthResponseDto> {
    const [database, storage] = await Promise.all([
      this.checkDatabase(),
      this.mediaService.checkStorageConnectivity(),
    ]);

    const response: HealthResponseDto = {
      status: database.status === 'up' && storage.status === 'up' ? 'ok' : 'degraded',
      database,
      storage,
    };

    if (response.status !== 'ok') {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  private async checkDatabase(): Promise<HealthResponseDto['database']> {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'up',
        provider: this.dataSource.options.type,
        detail: 'SELECT 1',
      };
    } catch (error) {
      return {
        status: 'down',
        provider: this.dataSource.options.type,
        detail: error instanceof Error ? error.message : 'Database connectivity failed.',
      };
    }
  }
}

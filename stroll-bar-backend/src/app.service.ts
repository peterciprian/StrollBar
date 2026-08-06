import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthDependencyDto, HealthResponseDto } from './common/dto/health-response.dto';
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

  async databaseHealth(): Promise<HealthDependencyDto> {
    try {
      const result = await this.dataSource.query('SELECT current_database() AS dbname, current_user AS username');
      const [row] = result.rows ?? [];
      return {
        status: 'up',
        provider: this.dataSource.options.type,
        detail: row ? `connected to ${row.dbname} as ${row.username}` : 'SELECT 1',
      };
    } catch (error) {
      return {
        status: 'down',
        provider: this.dataSource.options.type,
        detail: error instanceof Error ? error.message : 'Database connectivity failed.',
      };
    }
  }

  private async checkDatabase(): Promise<HealthResponseDto['database']> {
    return this.databaseHealth();
  }
}

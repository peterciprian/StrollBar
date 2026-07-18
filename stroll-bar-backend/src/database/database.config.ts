import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { resolveDatabaseType } from './column-types';
import { DATABASE_ENTITIES } from './entities';
import { InitialSchema1752864000000 } from './migrations/1752864000000-initial-schema';
import { AuthTokensAndPasswordReset1752885000000 } from './migrations/1752885000000-auth-tokens-and-password-reset';
import { MediaAssets1752896000000 } from './migrations/1752896000000-media-assets';

const DEFAULT_DB_LOCATION = 'backend/test/strollbar.sqlite';

function getBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

export function buildDatabaseOptions(): TypeOrmModuleOptions {
  const databaseType = resolveDatabaseType();

  if (databaseType === 'sqljs') {
    return {
      type: 'sqljs',
      location: process.env.DB_LOCATION ?? DEFAULT_DB_LOCATION,
      autoSave: getBoolean(process.env.DB_AUTO_SAVE, true),
      autoLoadEntities: true,
      entities: [...DATABASE_ENTITIES],
      migrations: [InitialSchema1752864000000, AuthTokensAndPasswordReset1752885000000, MediaAssets1752896000000],
      migrationsRun: getBoolean(process.env.DB_MIGRATIONS_RUN, false),
      synchronize: false,
      logging: false,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? '5432'),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'strollbar',
    ssl: getBoolean(process.env.DB_SSL, false) ? { rejectUnauthorized: false } : false,
    autoLoadEntities: true,
    entities: [...DATABASE_ENTITIES],
    migrations: [InitialSchema1752864000000, AuthTokensAndPasswordReset1752885000000, MediaAssets1752896000000],
    migrationsRun: getBoolean(process.env.DB_MIGRATIONS_RUN, false),
    synchronize: false,
    logging: false,
  };
}

export function buildDataSourceOptions(): DataSourceOptions {
  return buildDatabaseOptions() as DataSourceOptions;
}

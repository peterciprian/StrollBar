import { ColumnType } from 'typeorm';

export type SupportedDatabaseType = 'postgres' | 'sqljs';

export function resolveDatabaseType(): SupportedDatabaseType {
  return (process.env.DB_TYPE ?? 'postgres').toLowerCase() === 'sqljs' ? 'sqljs' : 'postgres';
}

const databaseType = resolveDatabaseType();

export const DATABASE_ID_COLUMN_TYPE: ColumnType = databaseType === 'postgres' ? 'uuid' : 'varchar';
export const DATABASE_DATE_COLUMN_TYPE: ColumnType = databaseType === 'postgres' ? 'timestamptz' : 'datetime';
export const DATABASE_JSON_COLUMN_TYPE: ColumnType = databaseType === 'postgres' ? 'jsonb' : 'simple-json';
export const DATABASE_FLOAT_COLUMN_TYPE: ColumnType = databaseType === 'postgres' ? 'double precision' : 'float';

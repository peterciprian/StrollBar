import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './database.config';

export default new DataSource(buildDataSourceOptions());

/**
 * For the TypeORM CLI, e.g. after `npm run build`:
 *   npm run migration:run
 *   npm run migration:revert
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { typeormOptions } from './typeorm.options.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

export default new DataSource(typeormOptions(url, false));

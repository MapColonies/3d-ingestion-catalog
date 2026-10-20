import { readFileSync } from 'fs';
import { ConnectionOptions } from 'typeorm';
import { DbConfig } from '../common/interfaces';
import { Metadata } from './entities/metadata';

export const createConnectionOptions = (dbConfig: DbConfig): ConnectionOptions => {
  const ENTITIES_DIRS = [Metadata, 'src/DAL/entities/*.ts'];
  const { enableSslAuth, sslPaths, ...connectionOptions } = dbConfig;
  if (enableSslAuth) {
    connectionOptions.password = undefined;
    connectionOptions.ssl = {
      key: readFileSync(sslPaths.key),
      cert: readFileSync(sslPaths.cert),
      ...(sslPaths.ca !== undefined && sslPaths.ca !== '' ? { ca: readFileSync(sslPaths.ca) } : { rejectUnauthorized: false }),
    };
  }
  return { entities: ENTITIES_DIRS, ...connectionOptions };
};

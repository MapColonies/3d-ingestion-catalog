import { readFileSync } from 'fs';
import { ConnectionOptions } from 'typeorm';
import { DbConfig } from '../common/interfaces';
import { Metadata } from './entity/generated';

export const createConnectionOptions = (dbConfig: DbConfig): ConnectionOptions => {
  const ENTITIES_DIRS = [Metadata, 'src/DAL/entity/*.ts'];
  const { enableSslAuth, sslPaths, ...connectionOptions } = dbConfig;
  if (enableSslAuth) {
    connectionOptions.password = undefined;
    connectionOptions.ssl = { key: readFileSync(sslPaths.key), cert: readFileSync(sslPaths.cert), ca: readFileSync(sslPaths.ca) };
  }
  return { entities: ENTITIES_DIRS, ...connectionOptions };
};

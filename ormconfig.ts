import config from 'config';
import { DbConfig } from './src/common/interfaces';
import { createConnectionOptions } from './src/DAL/createConnectionOptions';

const connectionOptions = config.get<DbConfig>('db');

module.exports = {
  ...createConnectionOptions(connectionOptions),
  entities: ['src/DAL/entities/*.ts'],
  migrationsTableName: 'metadata_migration_table',
  migrations: ['src/DAL/migration/*.ts'],
  cli: {
    migrationsDir: 'src/DAL/migration',
  },
};

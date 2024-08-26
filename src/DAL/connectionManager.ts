import { createConnection, Connection } from 'typeorm';
import { singleton } from 'tsyringe';
import httpStatusCodes from 'http-status-codes';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { DB_TIMEOUT } from '../common/constants';
import { promiseTimeout } from '../common/utils/promiseTimeout';
import { AppError } from '../common/appError';
import { getConfig } from '../common/config';
import { Metadata } from './entities/metadata';

@singleton()
export class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  private connection: Connection | null = null;
  private readonly connectionConfig: PostgresConnectionOptions;

  public constructor() {
    const configInstance = getConfig();
    const {ssl, ...a} = configInstance.get('db');
    this.connectionConfig = { ...a, type: "postgres", ssl: (ssl && ssl.enabled) ? ssl : undefined };
  }

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  public healthCheck = (): (() => Promise<void>) => {
    return async (): Promise<void> => {
      if (!this.connection) {
        throw new AppError('DB', httpStatusCodes.INTERNAL_SERVER_ERROR, 'Problem with connection to DB', false);
      }
      const check = this.connection.query('SELECT 1').then(() => {
        return;
      });
      return promiseTimeout<void>(DB_TIMEOUT, check);
    };
  };

  public async initializeConnection(): Promise<void> {
    if (!this.connection) {
      const ENTITIES_DIRS = [Metadata, 'src/DAL/entities/*.ts'];
      
      this.connection = await createConnection({ entities: ENTITIES_DIRS, ...this.connectionConfig });
      await this.connection.synchronize();
    }
  }

  public getConnection(): Connection {
    if (!this.connection) {
      throw new AppError('DB', httpStatusCodes.INTERNAL_SERVER_ERROR, 'Problem with connection to DB', false);
    }
    return this.connection;
  }

  public shutdown(): () => Promise<void> {
    return async (): Promise<void> => {
      if (!this.connection) {
        throw new AppError('DB', httpStatusCodes.INTERNAL_SERVER_ERROR, 'Problem with connection to DB', false);
      }
      await this.connection.close();
    };
  }
}

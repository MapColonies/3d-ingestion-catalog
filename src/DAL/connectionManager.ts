import config from 'config';
import { createConnection, Connection } from 'typeorm';
import { singleton } from 'tsyringe';
import httpStatusCodes from 'http-status-codes';
import { DB_TIMEOUT } from '../common/constants';
import { promiseTimeout } from '../common/utils/promiseTimeout';
import { AppError } from '../common/appError';
import { DbConfig } from '../common/interfaces';
import { createConnectionOptions } from './createConnectionOptions';

@singleton()
export class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  private connection: Connection | null = null;
  private readonly connectionConfig: DbConfig;

  public constructor() {
    this.connectionConfig = config.get<DbConfig>('db');
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
      this.connection = await createConnection(createConnectionOptions(this.connectionConfig));
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

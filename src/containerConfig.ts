import { container } from 'tsyringe';
import config from 'config';
import { Connection } from 'typeorm';
import { Attributes, trace } from '@opentelemetry/api';
import { logMethod, Metrics } from '@map-colonies/telemetry';
import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { DB_TIMEOUT, SERVICES, SERVICE_NAME } from './common/constants';
import { promiseTimeout } from './common/utils/promiseTimeout';
import { Metadata } from './metadata/models/generated';
import { initializeConnection } from './common/utils/db';
import { tracing } from './common/tracing';
import { DbConfig } from './common/interfaces';

const healthCheck = (connection: Connection): (() => Promise<void>) => {
  return async (): Promise<void> => {
    const check = connection.query('SELECT 1').then(() => {
      return;
    });
    return promiseTimeout<void>(DB_TIMEOUT, check);
  };
};

const beforeShutdown = (connection: Connection): (() => Promise<void>) => {
  return async (): Promise<void> => {
    await connection.close();
  };
};

async function registerExternalValues(): Promise<void> {
  container.register(SERVICES.CONFIG, { useValue: config });

  const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
  const logger = jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, hooks: { logMethod } });
  container.register(SERVICES.LOGGER, { useValue: logger });


  const attributes: Attributes = { name: SERVICE_NAME }; 
  const metrics = new Metrics(attributes);
  const meter = metrics.start();
  container.register(SERVICES.METER, { useValue: meter });

  tracing.start();
  const tracer = trace.getTracer(SERVICE_NAME);
  container.register(SERVICES.TRACER, { useValue: tracer });

  const connectionOptions = config.get<DbConfig>('db');
  const connection = await initializeConnection(connectionOptions);
  container.register(Connection, { useValue: connection });
  container.register(SERVICES.METADATA_REPOSITORY, { useValue: connection.getRepository(Metadata) });

  container.register(SERVICES.HEALTHCHECK, { useValue: healthCheck(connection) });
  container.register('onSignal', {
    useValue: async (): Promise<void> => {
      await Promise.all([tracing.stop(), metrics.stop(), beforeShutdown(connection)]);
    },
  });
}

export { registerExternalValues };

import { Application } from 'express';
import { registerExternalValues, RegisterOptions } from './containerConfig';
import { ServerBuilder } from './serverBuilder';
import { initConfig } from './common/config';

async function getApp(registerOptions?: RegisterOptions): Promise<Application> {
  await initConfig(false);
  const container = await registerExternalValues(registerOptions);
  const app = container.resolve(ServerBuilder).build();
  return app;
}

export { getApp };

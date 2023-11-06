import { ConnectionOptions } from 'typeorm';

export interface IServerConfig {
  port: string;
}

export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface OpenApiConfig {
  filePath: string;
  basePath: string;
  jsonPath: string;
  uiPath: string;
}

export type DbConfig = {
  enableSslAuth: boolean;
  sslPaths: { ca: string; cert: string; key: string };
} & ConnectionOptions;

export interface ILookupOption{
  value: string;
  translationCode: string;
  properties?: Record<string, unknown> | undefined;
}

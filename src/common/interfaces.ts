import { RecordStatus } from '@map-colonies/mc-model-types';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

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

export interface DbConfig extends PostgresConnectionOptions {
  enableSslAuth: boolean;
  sslPaths: { ca: string; cert: string; key: string };
}

export interface MetadataParams {
  identifier: string;
}

export interface IUpdate {
  productName?: string;
  description?: string;
  creationDate?: Date;
  minResolutionMeter?: number;
  maxResolutionMeter?: number;
  maxAccuracyCE90?: number;
  absoluteAccuracyLE90?: number;
  accuracySE90?: number;
  relativeAccuracySE90?: number;
  visualAccuracy?: number;
  heightRangeFrom?: number;
  heightRangeTo?: number;
  classification?: string;
  producerName?: string;
  minFlightAlt?: number;
  maxFlightAlt?: number;
  geographicArea?: string;
  keywords?: string;
}

export interface IUpdatePayload extends IUpdate {
  sensors?: string[];
}

export interface IUpdateMetadata extends IUpdate {
  sensors?: string;
}

export interface IUpdateStatus {
  productStatus: RecordStatus;
}

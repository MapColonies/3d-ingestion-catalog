import { ProductType, RecordStatus } from '@map-colonies/mc-model-types';
import { Polygon } from 'geojson';
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
  sourceDateStart?: Date;
  sourceDateEnd?: Date;
  minResolutionMeter?: number;
  maxResolutionMeter?: number;
  maxAccuracyCE90?: number;
  absoluteAccuracyLE90?: number;
  accuracySE90?: number;
  relativeAccuracySE90?: number;
  visualAccuracy?: number;
  footprint?: Polygon;
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
  productBoundingBox?: string;
  wktGeometry?: string;
}

export interface IUpdateStatus {
  productStatus: RecordStatus;
}

export interface LogContext {
  fileName: string;
  class: string;
  function?: string;
}

export interface IFindRecordsPayload {
  id?: string;
  productId?: string;
  productName?: string;
  productType?: ProductType;
  creationDate?: string;
  sourceDateStart?: string;
  sourceDateEnd?: string;
  minResolutionMeter?: number;
  maxResolutionMeter?: number;
  maxAccuracyCE90?: number;
  absoluteAccuracyLE90?: number;
  accuracySE90?: number;
  relativeAccuracySE90?: number;
  visualAccuracy?: number;
  heightRangeFrom?: number;
  heightRangeTo?: number;
  srsId?: string;
  srsName?: string;
  classification?: string;
  productionSystem?: string;
  productionSystemVer?: string;
  producerName?: string;
  minFlightAlt?: number;
  maxFlightAlt?: number;
  geographicArea?: string;
  productStatus?: string;
}

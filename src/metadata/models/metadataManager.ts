import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import httpStatus from 'http-status-codes';
import { Repository } from 'typeorm';
import * as turf from '@turf/turf';
import wkt from 'terraformer-wkt-parser';
import client from 'prom-client';
import { SERVICES } from '../../common/constants';
import { IConfig, IUpdateMetadata, IUpdatePayload, IUpdateStatus } from '../../common/interfaces';
import { formatStrings, linksToString } from '../../common/utils/format';
import { AppError } from '../../common/appError';
import { IPayload } from '../../common/types';
import { Metadata } from '../../DAL/entities/metadata';

@injectable()
export class MetadataManager {
  //metrics
  private readonly requestCounter?: client.Counter<'requestType'>;
  private readonly crudHistogram?: client.Histogram<'requestType'>;
  
  public constructor(
    @inject(SERVICES.METADATA_REPOSITORY) private readonly repository: Repository<Metadata>,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.METRICS_REGISTRY) registry?: client.Registry
  ) {
    if (registry !== undefined) {
      this.requestCounter = new client.Counter({
        name: 'record_requests_total',
        help: 'The total number of all requests',
        labelNames: ['requestType'] as const,
        registers: [registry],
      });

      this.crudHistogram = new client.Histogram({
        name: 'db_crud_duration_seconds',
        help: 'get and create record duration time (seconds)',
        buckets: config.get<number[]>('telemetry.metrics.buckets'),
        labelNames: ['requestType'] as const,
        registers: [registry],
      });
    }
  }

  public async getAll(): Promise<Metadata[] | undefined> {
    this.logger.debug({ msg: 'Get all models metadata' });
    this.requestCounter?.inc({ requestType: 'GET' });
    try {
      const getAllTimerEnd = this.crudHistogram?.startTimer({ requestType: 'GET' });
      const records = await this.repository.find();
      if (getAllTimerEnd) {
        getAllTimerEnd();
      }
      this.logger.info({ msg: 'Got all records' });
      return records;
    } catch (error) {
      this.logger.error({ msg: 'Failed to get all records', error });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  public async getRecord(identifier: string): Promise<Metadata> {
    this.logger.debug({ msg: 'Get metadata of record', modelId: identifier });
    this.requestCounter?.inc({ requestType: 'GET' });
    try {
      const getTimerEnd = this.crudHistogram?.startTimer({ requestType: 'GET' });
      const record = await this.repository.findOne(identifier);
      if (getTimerEnd) {
        getTimerEnd();
      }
      if (record === undefined) {
        throw new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true);
      }
      this.logger.info({ msg: 'Got metadata ', modelId: identifier });
      return record;
    } catch (error) {
      this.logger.error({ msg: 'Failed to get metadata', modelId: identifier, error });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  public async createRecord(payload: IPayload): Promise<Metadata> {
    this.requestCounter?.inc({ requestType: 'POST' });
    this.logger.debug({ msg: 'create new record', modelId: payload.id, modelName: payload.productName, payload });
    try {
      payload = formatStrings<IPayload>(payload);
      const metadata = await this.setPostPayloadToEntity(payload);
      const createTimerEnd = this.crudHistogram?.startTimer({ requestType: 'POST' });
      const newRecord: Metadata = await this.repository.save(metadata);
      if (createTimerEnd) {
        createTimerEnd();
      }
      this.logger.info({ msg: 'Saved new record', modelId: payload.id, modelName: payload.productName, payload });
      return newRecord;
    } catch (error) {
      this.logger.error({ msg: 'Saving new record failed', modelId: payload.id, modelName: payload.productName, error, payload });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  public async updateRecord(identifier: string, payload: IUpdatePayload): Promise<Metadata> {
    this.logger.debug({ msg: 'Update partial metadata', modelId: identifier, modelName: payload.productName, payload });
    this.requestCounter?.inc({ requestType: 'PATCH' });
    try {
      const updateTimerEnd = this.crudHistogram?.startTimer({ requestType: 'PATCH' });
      const record: Metadata | undefined = await this.repository.findOne(identifier);
      if (record === undefined) {
        this.logger.error({ msg: 'model identifier not found', modelId: identifier, modelName: payload.productName });
        throw new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true);
      }
      payload = formatStrings<IUpdatePayload>(payload);
      const updateMetadata: IUpdateMetadata = this.setPatchPayloadToEntity(payload);
      record.footprint = JSON.parse(record.footprint as unknown as string) as turf.Polygon;
      const metadata: Metadata = { ...record, ...updateMetadata };
      const updatedMetadata: Metadata = await this.repository.save(metadata);
      if (updateTimerEnd) {
        updateTimerEnd();
      }
      this.logger.info({ msg: 'Updated record', modelId: identifier, modelName: payload.productName, payload });
      return updatedMetadata;
    } catch (error) {
      this.logger.error({ msg: 'Error saving update of record', modelId: identifier, modelName: payload.productName, error, payload });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  public async deleteRecord(identifier: string): Promise<void> {
    this.logger.debug({ msg: 'Delete record', modelId: identifier });
    this.requestCounter?.inc({ requestType: 'DELETE' });
    try {
      const deleteTimerEnd = this.crudHistogram?.startTimer({ requestType: 'DELETE' });
      await this.repository.delete(identifier);
      if (deleteTimerEnd) {
        deleteTimerEnd();
      }
      this.logger.info({ msg: 'Deleted record', modelId: identifier });
    } catch (error) {
      this.logger.error({ msg: 'Failed to delete record', modelId: identifier, error });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  public async updateStatusRecord(identifier: string, payload: IUpdateStatus): Promise<Metadata> {
    this.logger.debug({ msg: 'Update status record', modelId: identifier, status: payload.productStatus });
    this.requestCounter?.inc({ requestType: 'PATCH' });
    try {
      const updateStatusTimerEnd = this.crudHistogram?.startTimer({ requestType: 'PATCH' });
      const record: Metadata | undefined = await this.repository.findOne(identifier);
      if (record === undefined) {
        this.logger.error({ msg: 'model identifier not found', modelId: identifier });
        throw new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true);
      }
      const metadata: Metadata = { ...record, productStatus: payload.productStatus };
      const updatedMetadata: Metadata = await this.repository.save(metadata);
      if (updateStatusTimerEnd) {
        updateStatusTimerEnd();
      }
      this.logger.info({ msg: 'Updated record', modelId: identifier, payload });
      return updatedMetadata;
    } catch (error) {
      this.logger.error({ msg: 'Error saving update of record', modelId: identifier, payload, error });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  public async findLastVersion(productId: string): Promise<number> {
    this.logger.debug({ msg: 'Get last product version', productId });
    this.requestCounter?.inc({ requestType: 'GET' });
    try {
      const getLastTimerEnd = this.crudHistogram?.startTimer({ requestType: 'GET' });
      const metadata: Metadata | undefined = await this.repository.findOne({ where: { productId }, order: { productVersion: 'DESC' } });
      if (getLastTimerEnd) {
        getLastTimerEnd();
      }
      const version = metadata !== undefined ? metadata.productVersion : 0;
      this.logger.info({ msg: 'Got latest model version', modelId: metadata?.id, version });
      return version;
    } catch (error) {
      this.logger.error({ msg: 'Error in retrieving latest model version', productId, error });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  private async setPostPayloadToEntity(payload: IPayload): Promise<Metadata> {
    const metadata: Metadata = new Metadata();
    Object.assign(metadata, payload);

    metadata.id = payload.id;
    if (payload.productId != undefined) {
      metadata.productVersion = (await this.findLastVersion(payload.productId)) + 1;
    } else {
      metadata.productVersion = 1;
      metadata.productId = payload.id;
    }

    if (payload.footprint !== undefined) {
      metadata.wktGeometry = wkt.convert(payload.footprint as GeoJSON.Geometry);
      metadata.productBoundingBox = turf.bbox(payload.footprint).toString();
    }

    metadata.sensors = payload.sensors!.join(', ');
    metadata.region = payload.region!.join(', ');
    metadata.links = linksToString(payload.links);

    return metadata;
  }

  private setPatchPayloadToEntity(payload: IUpdatePayload): IUpdateMetadata {
    const metadata: IUpdateMetadata = {};
    Object.assign(metadata, payload);

    if (payload.sensors != undefined) {
      metadata.sensors = payload.sensors.join(', ');
    }

    if (payload.footprint != undefined) {
      metadata.productBoundingBox = turf.bbox(payload.footprint).toString();
      metadata.wktGeometry = wkt.convert(payload.footprint);
    }

    return metadata;
  }
}

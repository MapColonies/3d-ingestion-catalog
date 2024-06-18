import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import httpStatus from 'http-status-codes';
import { Repository } from 'typeorm';
import { bbox } from '@turf/turf';
import wkt from 'terraformer-wkt-parser';
import { Tracer, trace } from '@opentelemetry/api';
import { THREE_D_CONVENTIONS } from '@map-colonies/telemetry/conventions';
import { withSpanAsyncV4, withSpanV4 } from '@map-colonies/telemetry';
import { SERVICES } from '../../common/constants';
import { IUpdateMetadata, IUpdatePayload, IUpdateStatus } from '../../common/interfaces';
import { formatStrings, linksToString } from '../../common/utils/format';
import { AppError } from '../../common/appError';
import { IPayload } from '../../common/types';
import { Metadata } from '../../DAL/entities/metadata';

@injectable()
export class MetadataManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer,
    @inject(SERVICES.METADATA_REPOSITORY) private readonly repository: Repository<Metadata>
  ) {}

  @withSpanAsyncV4
  public async getAll(): Promise<Metadata[] | undefined> {
    this.logger.debug({ msg: 'Get all models metadata' });
    try {
      const records = await this.repository.find();
      this.logger.info({ msg: 'Got all records' });
      return records;
    } catch (error) {
      this.logger.error({ msg: 'Failed to get all records', error });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  @withSpanAsyncV4
  public async getRecord(identifier: string): Promise<Metadata> {
    const spanActive = trace.getActiveSpan();
    spanActive?.setAttributes({
      [THREE_D_CONVENTIONS.three_d.catalogManager.catalogId]: identifier,
    });

    this.logger.debug({ msg: 'Get metadata of record', modelId: identifier });
    try {
      const record = await this.repository.findOne(identifier);
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

  @withSpanAsyncV4
  public async createRecord(payload: IPayload): Promise<Metadata> {
    const spanActive = trace.getActiveSpan();
    spanActive?.setAttributes({
      [THREE_D_CONVENTIONS.three_d.catalogManager.catalogId]: payload.id,
    });

    this.logger.debug({ msg: 'create new record', modelId: payload.id, modelName: payload.productName, payload });
    try {
      payload = formatStrings<IPayload>(payload);
      const metadata = await this.setPostPayloadToEntity(payload);
      const newRecord: Metadata = await this.repository.save(metadata);
      this.logger.info({ msg: 'Saved new record', modelId: payload.id, modelName: payload.productName, payload });
      return newRecord;
    } catch (error) {
      this.logger.error({ msg: 'Saving new record failed', modelId: payload.id, modelName: payload.productName, error, payload });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  @withSpanAsyncV4
  public async updateRecord(identifier: string, payload: IUpdatePayload): Promise<Metadata> {
    const spanActive = trace.getActiveSpan();
    spanActive?.setAttributes({
      [THREE_D_CONVENTIONS.three_d.catalogManager.catalogId]: identifier,
    });

    this.logger.debug({ msg: 'Update partial metadata', modelId: identifier, modelName: payload.productName, payload });
    try {
      const record: Metadata | undefined = await this.repository.findOne(identifier);
      if (record === undefined) {
        this.logger.error({ msg: 'model identifier not found', modelId: identifier, modelName: payload.productName });
        throw new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true);
      }
      payload = formatStrings<IUpdatePayload>(payload);
      const updateMetadata: IUpdateMetadata = this.setPatchPayloadToEntity(payload);
      const metadata: Metadata = { ...record, ...updateMetadata };
      const updatedMetadata: Metadata = await this.repository.save(metadata);
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

  @withSpanAsyncV4
  public async deleteRecord(identifier: string): Promise<void> {
    const spanActive = trace.getActiveSpan();
    spanActive?.setAttributes({
      [THREE_D_CONVENTIONS.three_d.catalogManager.catalogId]: identifier,
    });

    this.logger.debug({ msg: 'Delete record', modelId: identifier });
    try {
      await this.repository.delete(identifier);
      this.logger.info({ msg: 'Deleted record', modelId: identifier });
    } catch (error) {
      this.logger.error({ msg: 'Failed to delete record', modelId: identifier, error });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  @withSpanAsyncV4
  public async updateStatusRecord(identifier: string, payload: IUpdateStatus): Promise<Metadata> {
    const spanActive = trace.getActiveSpan();
    spanActive?.setAttributes({
      [THREE_D_CONVENTIONS.three_d.catalogManager.catalogId]: identifier,
    });

    this.logger.debug({ msg: 'Update status record', modelId: identifier, status: payload.productStatus });
    try {
      const record: Metadata | undefined = await this.repository.findOne(identifier);
      if (record === undefined) {
        this.logger.error({ msg: 'model identifier not found', modelId: identifier });
        throw new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true);
      }
      const metadata: Metadata = { ...record, productStatus: payload.productStatus };
      const updatedMetadata: Metadata = await this.repository.save(metadata);
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

  @withSpanAsyncV4
  public async findLastVersion(productId: string): Promise<number> {
    this.logger.debug({ msg: 'Get last product version', productId });
    try {
      const metadata: Metadata | undefined = await this.repository.findOne({ where: { productId }, order: { productVersion: 'DESC' } });
      const version = metadata !== undefined ? metadata.productVersion : 0;
      this.logger.info({ msg: 'Got latest model version', modelId: metadata?.id, version });
      return version;
    } catch (error) {
      this.logger.error({ msg: 'Error in retrieving latest model version', productId, error });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  @withSpanAsyncV4
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
      metadata.productBoundingBox = bbox(payload.footprint).toString();
    }

    metadata.sensors = payload.sensors!.join(', ');
    metadata.region = payload.region!.join(', ');
    metadata.links = linksToString(payload.links);

    return metadata;
  }

  @withSpanV4
  private setPatchPayloadToEntity(payload: IUpdatePayload): IUpdateMetadata {
    const metadata: IUpdateMetadata = {};
    Object.assign(metadata, payload);

    if (payload.sensors != undefined) {
      metadata.sensors = payload.sensors.join(', ');
    }

    if (payload.footprint != undefined) {
      metadata.productBoundingBox = bbox(payload.footprint).toString();
      metadata.wktGeometry = wkt.convert(payload.footprint);
    }

    return metadata;
  }
}

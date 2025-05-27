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
import { IFindRecordsPayload, IUpdateMetadata, IUpdatePayload, IUpdateStatus, LogContext } from '../../common/interfaces';
import { formatStrings, linksToString } from '../../common/utils/format';
import { AppError } from '../../common/appError';
import { IPayload } from '../../common/types';
import { Metadata } from '../../DAL/entities/metadata';

@injectable()
export class MetadataManager {
  private readonly logContext: LogContext;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer,
    @inject(SERVICES.METADATA_REPOSITORY) private readonly repository: Repository<Metadata>
  ) {
    this.logContext = {
      fileName: __filename,
      class: MetadataManager.name,
    };
  }

  @withSpanAsyncV4
  public async getAll(): Promise<Metadata[] | undefined> {
    const logContext = { ...this.logContext, function: this.getAll.name };
    this.logger.debug({
      msg: 'Get all models metadata',
      logContext,
    });
    try {
      const records = await this.repository.find();
      this.logger.info({
        msg: 'Got all records',
        logContext,
      });
      return records;
    } catch (err) {
      this.logger.error({
        msg: 'Failed to get all records',
        logContext,
        err,
      });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  @withSpanAsyncV4
  public async findRecords(payload: IFindRecordsPayload): Promise<Metadata[]> {
    const logContext = { ...this.logContext, function: this.findRecords.name };
    this.logger.debug({
      msg: 'Find Records metadata',
      logContext,
    });
    try {
        const records = await this.internalFindRecords(payload);
        this.logger.info({
          msg: 'Got all records',
          logContext,
        });
        return records;
    } catch (err) {
      this.logger.error({
        msg: 'Failed to get all records',
        logContext,
        err,
      });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  private findModelToEntity(model: IFindRecordsPayload): Partial<Metadata> {
    const entity = {} as Metadata;
    if (model.absoluteAccuracyLE90 !== undefined) {
      entity.absoluteAccuracyLE90 = model.absoluteAccuracyLE90;
    }
    if (model.accuracySE90 !== undefined) {
      entity.accuracySE90 = model.accuracySE90;
    }
    if (model.classification !== undefined) {
      entity.classification = model.classification;
    }
    
    if (model.id !== undefined) {
      entity.id = model.id;
    }
    if (model.links != undefined) {
      entity.links = this.linksToString(model.links);
    }
    return entity;
  }

  private async internalFindRecords(payload: IFindRecordsPayload): Promise<Metadata[]> {
    const entity = this.findModelToEntity(req);
    const query = this.repository.createQueryBuilder('records');
    
    const baseConditions = { ...entity };
    if (entity.productId != null) {
      delete baseConditions.productId;
    }
    if (entity.productType != null) {
      delete baseConditions.productType;
    }

    // Apply base conditions to the query
    query.where(baseConditions);
    if (entity.productId != null) {
      query.andWhere('LOWER(record.productId) = LOWER(:productId)', { productId: entity.productId });
    }

    if (entity.productType != null) {
      query.andWhere('LOWER(record.productType) = LOWER(:productType)', { productType: entity.productType });
    }

    const res = await query.getMany();
    return res.map((entity) => this.recordConvertor.entityToModel(entity));
  }

  @withSpanAsyncV4
  public async getRecord(identifier: string): Promise<Metadata> {
    const logContext = { ...this.logContext, function: this.getRecord.name };
    const spanActive = trace.getActiveSpan();
    spanActive?.setAttributes({
      [THREE_D_CONVENTIONS.three_d.catalogManager.catalogId]: identifier,
    });

    this.logger.debug({
      msg: 'Get metadata of record',
      logContext,
      modelId: identifier,
    });
    try {
      const record = await this.repository.findOne(identifier);
      if (record === undefined) {
        throw new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true);
      }
      this.logger.info({
        msg: 'Got metadata ',
        logContext,
        modelId: identifier,
      });
      return record;
    } catch (err) {
      this.logger.error({
        msg: 'Failed to get metadata',
        logContext,
        modelId: identifier,
        err,
      });
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  @withSpanAsyncV4
  public async createRecord(payload: IPayload): Promise<Metadata> {
    const logContext = { ...this.logContext, function: this.createRecord.name };
    const spanActive = trace.getActiveSpan();
    spanActive?.setAttributes({
      [THREE_D_CONVENTIONS.three_d.catalogManager.catalogId]: payload.id,
    });

    this.logger.debug({
      msg: 'create new record',
      logContext,
      modelId: payload.id,
      modelName: payload.productName,
      payload,
    });
    try {
      payload = formatStrings<IPayload>(payload);
      const metadata = await this.setPostPayloadToEntity(payload);
      const newRecord: Metadata = await this.repository.save(metadata);
      this.logger.info({
        msg: 'Saved new record',
        logContext,
        modelId: payload.id,
        modelName: payload.productName,
        payload,
      });
      return newRecord;
    } catch (err) {
      this.logger.error({
        msg: 'Saving new record failed',
        logContext,
        modelId: payload.id,
        modelName: payload.productName,
        err,
        payload,
      });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  @withSpanAsyncV4
  public async updateRecord(identifier: string, payload: IUpdatePayload): Promise<Metadata> {
    const logContext = { ...this.logContext, function: this.updateRecord.name };
    const spanActive = trace.getActiveSpan();
    spanActive?.setAttributes({
      [THREE_D_CONVENTIONS.three_d.catalogManager.catalogId]: identifier,
    });

    this.logger.debug({
      msg: 'Update partial metadata',
      logContext,
      modelId: identifier,
      modelName: payload.productName,
      payload,
    });
    try {
      const record: Metadata | undefined = await this.repository.findOne(identifier);
      if (record === undefined) {
        this.logger.error({
          msg: 'model identifier not found',
          logContext,
          modelId: identifier,
          modelName: payload.productName,
        });
        throw new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true);
      }
      payload = formatStrings<IUpdatePayload>(payload);
      const updateMetadata: IUpdateMetadata = this.setPatchPayloadToEntity(payload);
      const metadata: Metadata = { ...record, ...updateMetadata };
      const updatedMetadata: Metadata = await this.repository.save(metadata);
      this.logger.info({
        msg: 'Updated record',
        logContext,
        modelId: identifier,
        modelName: payload.productName,
        payload,
      });
      return updatedMetadata;
    } catch (err) {
      this.logger.error({
        msg: 'Error saving update of record',
        logContext,
        modelId: identifier,
        modelName: payload.productName,
        err,
        payload,
      });
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  @withSpanAsyncV4
  public async deleteRecord(identifier: string): Promise<void> {
    const logContext = { ...this.logContext, function: this.deleteRecord.name };
    const spanActive = trace.getActiveSpan();
    spanActive?.setAttributes({
      [THREE_D_CONVENTIONS.three_d.catalogManager.catalogId]: identifier,
    });

    this.logger.debug({
      msg: 'Delete record',
      logContext,
      modelId: identifier,
    });
    try {
      await this.repository.delete(identifier);
      this.logger.info({
        msg: 'Deleted record',
        logContext,
        modelId: identifier,
      });
    } catch (err) {
      this.logger.error({
        msg: 'Failed to delete record',
        logContext,
        modelId: identifier,
        err,
      });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  @withSpanAsyncV4
  public async updateStatusRecord(identifier: string, payload: IUpdateStatus): Promise<Metadata> {
    const logContext = { ...this.logContext, function: this.updateStatusRecord.name };
    const spanActive = trace.getActiveSpan();
    spanActive?.setAttributes({
      [THREE_D_CONVENTIONS.three_d.catalogManager.catalogId]: identifier,
    });

    this.logger.debug({
      msg: 'Update status record',
      logContext,
      modelId: identifier,
      status: payload.productStatus,
    });
    try {
      const record: Metadata | undefined = await this.repository.findOne(identifier);
      if (record === undefined) {
        this.logger.error({
          msg: 'model identifier not found',
          logContext,
          modelId: identifier,
        });
        throw new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true);
      }
      const metadata: Metadata = { ...record, productStatus: payload.productStatus };
      const updatedMetadata: Metadata = await this.repository.save(metadata);
      this.logger.info({
        msg: 'Updated record',
        logContext,
        modelId: identifier,
        payload,
      });
      return updatedMetadata;
    } catch (err) {
      this.logger.error({
        msg: 'Error saving update of record',
        logContext,
        modelId: identifier,
        payload,
        err,
      });
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  @withSpanAsyncV4
  public async findLastVersion(productId: string): Promise<number> {
    const logContext = { ...this.logContext, function: this.findLastVersion.name };
    this.logger.debug({
      msg: 'Get last product version',
      logContext,
      productId,
    });
    try {
      const metadata: Metadata | undefined = await this.repository.findOne({ where: { productId }, order: { productVersion: 'DESC' } });
      const version = metadata !== undefined ? metadata.productVersion : 0;
      this.logger.info({
        msg: 'Got latest model version',
        logContext,
        modelId: metadata?.id,
        version,
      });
      return version;
    } catch (err) {
      this.logger.error({
        msg: 'Error in retrieving latest model version',
        logContext,
        productId,
        err,
      });
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

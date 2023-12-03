import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import httpStatus from 'http-status-codes';
import { Repository } from 'typeorm';
import * as turf from '@turf/turf';
import wkt from 'terraformer-wkt-parser';
import { RecordStatus } from '@map-colonies/mc-model-types';
import { SERVICES } from '../../common/constants';
import { DeleteRequest, IUpdate, IUpdateMetadata, IUpdatePayload, IUpdateStatus } from '../../common/interfaces';
import { ValidationManager } from '../../validator/validationManager';
import { formatStrings, linksToString } from '../../common/utils/format';
import { AppError } from '../../common/appError';
import { IPayload } from '../../common/types';
import { Metadata } from '../../DAL/entities/metadata';
import { StoreTriggerCall } from '../../externalServices/storeTrigger/requestCall';
import { StoreTriggerResponse } from '../../externalServices/storeTrigger/interfaces';

@injectable()
export class MetadataManager {
  public constructor(
    @inject(SERVICES.METADATA_REPOSITORY) private readonly repository: Repository<Metadata>,
    @inject(ValidationManager) private readonly validator: ValidationManager,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(StoreTriggerCall) private readonly storeTrigger: StoreTriggerCall
  ) {}

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

  public async getRecord(identifier: string): Promise<Metadata> {
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

  public async createRecord(payload: IPayload): Promise<Metadata> {
    this.logger.debug({ msg: 'create new record', modelId: payload.id, modelName: payload.productName, payload });
    try {
      payload = formatStrings<IPayload>(payload);
      const isValid = await this.validator.validatePost(payload);
      if (typeof isValid === 'string') {
        throw new AppError('BadValues', httpStatus.BAD_REQUEST, isValid, true);
      }
      const metadata = await this.setPostPayloadToEntity(payload);
      const newRecord: Metadata = await this.repository.save(metadata);
      this.logger.info({ msg: 'Saved new record', modelId: payload.id, modelName: payload.productName, payload });
      return newRecord;
    } catch (error) {
      this.logger.error({ msg: 'Saving new record failed', modelId: payload.id, modelName: payload.productName, error, payload });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  public async updateRecord(identifier: string, payload: IUpdatePayload): Promise<Metadata> {
    this.logger.debug({ msg: 'Update partial metadata', modelId: identifier, modelName: payload.productName, payload });
    try {
      const record: Metadata | undefined = await this.repository.findOne(identifier);
      if (record === undefined) {
        this.logger.error({ msg: 'model identifier not found', modelId: identifier, modelName: payload.productName });
        throw new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true);
      }
      payload = formatStrings<IUpdatePayload>(payload);
      const isValid = await this.validator.validatePatch(identifier, payload);
      if (typeof isValid === 'string') {
        throw new AppError('BadValues', httpStatus.BAD_REQUEST, isValid, true);
      }
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

  public async deleteRecord(identifier: string): Promise<void> {
    this.logger.debug({ msg: 'Delete record', modelId: identifier });
    try {
      await this.repository.delete(identifier);
      this.logger.info({ msg: 'Deleted record', modelId: identifier });
    } catch (error) {
      this.logger.error({ msg: 'Failed to delete record', modelId: identifier, error });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  public async startDeleteRecord(identifier: string): Promise<StoreTriggerResponse> {
    this.logger.debug({ msg: 'delete record', modelId: identifier });
    try {
      const record: Metadata | undefined = await this.repository.findOne(identifier);
      if (record === undefined) {
        this.logger.error({ msg: 'model identifier not found', modelId: identifier });
        throw new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true);
      }
      if (record.productStatus != RecordStatus.UNPUBLISHED) {
        this.logger.error({ msg: 'model with status PUBLISHED cannot be deleted', modelId: identifier });
        throw new AppError(
          'BAD_REQUEST',
          httpStatus.BAD_REQUEST,
          ` Model ${record.producerName} is PUBLISHED. The model must be UNPUBLISHED to be deleted!`,
          true
        );
      }
      this.logger.info({ msg: 'starting deleting record', modelId: identifier, modelName: record.producerName });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
    }
    const record: Metadata = await this.repository.findOneOrFail(identifier);
    const link: string = record.links.split(',,3D_LAYER,')[0];
    const request: DeleteRequest = {
      modelId: identifier,
      modelLink: link,
    };
    try {
      const response: StoreTriggerResponse = await this.storeTrigger.createFlow(request);
      return response;
    } catch (error) {
      this.logger.error({ msg: 'Error in creating flow', identifier, modelName: record.producerName, error, record });
      throw new AppError('', httpStatus.INTERNAL_SERVER_ERROR, 'store-trigger service is not available', true);
    }
  }

  public async updateStatusRecord(identifier: string, payload: IUpdateStatus): Promise<Metadata> {
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

  public async findLastVersion(identifier: string): Promise<number> {
    this.logger.debug({ msg: 'Get last product version', modelId: identifier });
    try {
      const metadata: Metadata | undefined = await this.repository.findOne({ where: { productId: identifier }, order: { productVersion: 'DESC' } });
      const version = metadata !== undefined ? metadata.productVersion : 0;
      this.logger.info({ msg: 'Got latest model version', modelId: identifier, version });
      return version;
    } catch (error) {
      this.logger.error({ msg: 'Error in retrieving latest model version', modelId: identifier, error });
      throw new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true);
    }
  }

  private async setPostPayloadToEntity(payload: IPayload): Promise<Metadata> {
    const entity: Metadata = new Metadata();
    Object.assign(entity, payload);

    entity.id = payload.id;
    if (payload.productId != undefined) {
      entity.productVersion = (await this.findLastVersion(payload.productId)) + 1;
    } else {
      entity.productVersion = 1;
      entity.productId = payload.id;
    }

    if (payload.footprint !== undefined) {
      entity.wktGeometry = wkt.convert(payload.footprint as GeoJSON.Geometry);
      entity.productBoundingBox = turf.bbox(payload.footprint).toString();
    }

    entity.sensors = payload.sensors!.join(', ');
    entity.region = payload.region!.join(', ');
    entity.links = linksToString(payload.links);

    return entity;
  }

  private setPatchPayloadToEntity(payload: IUpdatePayload): IUpdateMetadata {
    const metadata: IUpdateMetadata = {
      ...(payload as IUpdate),
      ...(payload.sensors && { sensors: payload.sensors.join(', ') }),
    };

    return metadata;
  }
}

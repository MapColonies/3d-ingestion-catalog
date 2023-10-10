import { inject, injectable } from 'tsyringe';
import { Repository } from 'typeorm';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from '../../common/constants';
import { IUpdateMetadata, IUpdateStatus } from '../../common/dataModels/records';
import { EntityNotFoundError, IdAlreadyExistsError } from './errors';
import { Metadata } from './generated';

@injectable()
export class MetadataManager {
  public constructor(
    @inject(SERVICES.METADATA_REPOSITORY) private readonly repository: Repository<Metadata>,
    @inject(SERVICES.LOGGER) private readonly logger: Logger
  ) {}

  public async getAll(): Promise<Metadata[] | undefined> {
    this.logger.debug({ msg: 'Get all models metadata' });
    try {
      const records = await this.repository.find();
      this.logger.info({ msg: 'Got all records' });
      return records;
    } catch (error) {
      this.logger.error({ msg: 'Failed to get all records', error });
      throw error;
    }
  }

  public async getRecord(identifier: string): Promise<Metadata | undefined> {
    this.logger.debug({ msg: 'Get metadata of record', modelId: identifier });
    try {
      const record = await this.repository.findOne(identifier);
      this.logger.info({ msg: 'Got metadata ', modelId: identifier });
      return record;
    } catch (error) {
      this.logger.error({ msg: 'Failed to get metadata', modelId: identifier, error });
      throw error;
    }
  }

  public async createRecord(payload: Metadata): Promise<Metadata> {
    this.logger.debug({ msg: 'create new record', modelId: payload.id, metadata: payload });
    try {
      const record: Metadata | undefined = await this.repository.findOne(payload.id);
      if (record !== undefined) {
        this.logger.error({ msg: 'duplicate identifier', modelId: payload.id });
        throw new IdAlreadyExistsError(`Record with identifier: ${payload.id} already exists!`);
      }
      const newMetadata: Metadata = await this.repository.save(payload);
      this.logger.info({ msg: 'Saved new record', modelId: payload.id });
      return newMetadata;
    } catch (error) {
      this.logger.error({ msg: 'Saving new record failed', modelId: payload.id, error });
      throw error;
    }
  }

  public async updatePartialRecord(identifier: string, payload: IUpdateMetadata): Promise<Metadata> {
    this.logger.debug({ msg: 'Update partial metadata', modelId: identifier });
    try {
      const record: Metadata | undefined = await this.repository.findOne(identifier);
      if (record === undefined) {
        this.logger.error({ msg: 'model identifier not found', modelId: identifier });
        throw new EntityNotFoundError(`Metadata record ${identifier} does not exist`);
      }
      const metadata: Metadata = { ...record, ...payload };
      const updatedMetadata: Metadata = await this.repository.save(metadata);
      this.logger.info({ msg: 'Updated record', modelId: identifier });
      return updatedMetadata;
    } catch (error) {
      this.logger.error({ msg: 'error saving update of record ', modelId: identifier, error });
      throw error;
    }
  }

  public async deleteRecord(identifier: string): Promise<void> {
    this.logger.debug({ msg: 'Delete record', modelId: identifier });
    try {
      await this.repository.delete(identifier);
      this.logger.info({ msg: 'Deleted record', modelId: identifier });
    } catch (error) {
      this.logger.error({ msg: 'Failed to delete record', modelId: identifier, error });
      throw error;
    }
  }

  public async updateStatusRecord(identifier: string, payload: IUpdateStatus): Promise<Metadata> {
    this.logger.debug({ msg: 'Update status record', modelId: identifier, status: payload.productStatus });
    try {
      const record: Metadata | undefined = await this.repository.findOne(identifier);
      if (record === undefined) {
        this.logger.error({ msg: 'model identifier not found', modelId: identifier });
        throw new EntityNotFoundError(`Metadata record ${identifier} does not exist`);
      }
      const metadata: Metadata = { ...record, productStatus: payload.productStatus };
      const updatedMetadata: Metadata = await this.repository.save(metadata);
      this.logger.info({ msg: 'Updated record', modelId: identifier, status: payload.productStatus });
      return updatedMetadata;
    } catch (error) {
      this.logger.error({ msg: 'error saving update of record ', modelId: identifier, status: payload.productStatus, error });
      throw error;
    }
  }

  public async findLastVersion(identifier: string): Promise<number> {
    this.logger.debug({ msg: 'Get last product version', modelId: identifier });
    try {
      const metadata: Metadata | undefined = await this.repository.findOne({ where: { productId: identifier }, order: { productVersion: 'DESC' } });
      this.logger.info({ msg: 'Got latest model version', modelId: identifier });
      return metadata !== undefined ? metadata.productVersion : 0;
    } catch (error) {
      this.logger.error({ msg: 'Error in retrieving latest model version', modelId: identifier, error });
      throw error;
    }
  }

  /*
  deprecated: updateFull record
  public async updateRecord(identifier: string, payload: Metadata): Promise<Metadata> {
    this.logger.info(`Update metadata record ${identifier}: ${JSON.stringify(payload)}`);
    const ifExists: Metadata | undefined = await this.repository.findOne(identifier);
    if (ifExists == undefined && payload.id) {
      throw new EntityNotFoundError(`Metadata record ${identifier} does not exist`);
    }
    const newMetadata: Partial<Metadata> = { ...payload, id: identifier };
    const updatedMetadata = await this.repository.save(newMetadata);
    return updatedMetadata;
  }
  */
}

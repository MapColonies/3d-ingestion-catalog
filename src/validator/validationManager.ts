import { inject, injectable } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import httpStatus from 'http-status-codes';
import { Repository } from 'typeorm';
import { SERVICES } from '../common/constants';
import { IUpdatePayload } from '../common/interfaces';
import { AppError } from '../common/appError';
import { LookupTablesCall } from '../externalServices/lookUpTables/requestCall';
import { Metadata } from '../metadata/models/generated';
import { IPayload } from '../common/types';

@injectable()
export class ValidationManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(LookupTablesCall) private readonly lookupTables: LookupTablesCall,
    @inject(SERVICES.METADATA_REPOSITORY) private readonly repository: Repository<Metadata>
  ) {}

  public async validatePatch(id: string, payload: IUpdatePayload): Promise<boolean | string> {
    let result: boolean | string;

    result = await this.validateClassification(payload.classification);
    if (typeof result == 'string') {
      return result;
    }
    result = await this.validateRecordExistence(id);
    if (typeof result == 'string') {
      return result;
    }

    return true;
  }

  public async validatePost(payload: IPayload): Promise<boolean | string> {
    let result: boolean | string;

    result = await this.validateUniqID(payload.id);
    if (typeof result == 'string') {
      return result;
    }
    result = await this.validateProductID(payload.productId);
    if (typeof result == 'string') {
      return result;
    }
    result = this.validateDates(payload.sourceDateStart, payload.sourceDateEnd);
    if (typeof result == 'string') {
      return result;
    }
    result = this.validateResolutionMeter(payload.minResolutionMeter, payload.maxResolutionMeter);
    if (typeof result == 'string') {
      return result;
    }
    result = await this.validateClassification(payload.classification);
    if (typeof result == 'string') {
      return result;
    }

    return true;
  }

  private async validateClassification(classification: string | undefined): Promise<boolean | string> {
    try {
      if (classification == undefined) {
        return `classification is a required field! Provide it`;
      }
      const classifications: string[] = await this.lookupTables.getClassifications();
      if (classifications.includes(classification)) {
        return true;
      }
      return `Classification is not a valid value! Optional values: ${classifications.join()}`;
    } catch (error) {
      this.logger.error({ msg: `Couldn't get classifications from lookupTables`, error });
      throw new AppError('LookupTables', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with LookupTables service', true);
    }
  }

  private async validateProductID(productId: string | undefined): Promise<boolean | string> {
    if (productId == undefined) {
      return true;
    }
    try {
      if ((await this.repository.findOne(productId)) === undefined) {
        return `productId: '${productId}' doesn't exist in the DB`;
      }
      return true;
    } catch (error) {
      throw new AppError('Catalog', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB during validation of productID', true);
    }
  }

  private async validateUniqID(id: string): Promise<boolean | string> {
    try {
      const record: Metadata | undefined = await this.repository.findOne(id);
      if (record !== undefined) {
        throw new AppError('DuplicatedID', httpStatus.CONFLICT, `Record with identifier: ${id} already exists!`, true);
      }
      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Catalog', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB during validation of ID', true);
    }
  }

  private validateDates(startDate: Date | undefined, endDate: Date | undefined): boolean | string {
    if (startDate == undefined || endDate == undefined) {
      return 'Must enter dates!';
    }
    if (startDate > endDate) {
      return 'sourceStartDate should not be later than sourceEndDate';
    }
    return true;
  }

  private validateResolutionMeter(minResolutionMeter: number | undefined, maxResolutionMeter: number | undefined): boolean | string {
    if (minResolutionMeter == undefined || maxResolutionMeter == undefined) {
      return true;
    }
    if (minResolutionMeter > maxResolutionMeter) {
      return 'minResolutionMeter should not be bigger than maxResolutionMeter';
    }
    return true;
  }

  private async validateRecordExistence(id: string): Promise<boolean | string> {
    try {
      const record: Metadata | undefined = await this.repository.findOne(id);
      if (record === undefined) {
        return `Record with identifier: ${id} doesn't exist!`;
      }
      return true;
    } catch (error) {
      throw new AppError('Catalog', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB during validation of record existence', true);
    }
  }
}

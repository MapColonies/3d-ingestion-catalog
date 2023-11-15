import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { MetadataManager } from '../models/metadataManager';
import { Metadata } from '../../DAL/entity/generated';
import { IUpdatePayload, IUpdateStatus, MetadataParams } from '../../common/interfaces';
import { IPayload } from '../../common/types';

type GetAllRequestHandler = RequestHandler<undefined, Metadata[]>;
type GetRequestHandler = RequestHandler<MetadataParams, Metadata, number>;
type CreateRequestHandler = RequestHandler<undefined, Metadata, IPayload>;
type UpdatePartialRequestHandler = RequestHandler<MetadataParams, Metadata, IUpdatePayload>;
type DeleteRequestHandler = RequestHandler<MetadataParams>;
type UpdateStatusRequestHandler = RequestHandler<MetadataParams, Metadata, IUpdateStatus>;

@injectable()
export class MetadataController {
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(MetadataManager) private readonly manager: MetadataManager,
    @inject(SERVICES.METER) private readonly meter: Meter
  ) {
    this.createdResourceCounter = meter.createCounter('created_resource');
  }

  public getAll: GetAllRequestHandler = async (req, res, next) => {
    try {
      const metadataList = await this.manager.getAll();
      if (!metadataList || metadataList.length == 0) {
        this.logger.info({ msg: 'No Data found' });
        return res.sendStatus(httpStatus.NO_CONTENT);
      }
      return res.status(httpStatus.OK).json(metadataList);
    } catch (error) {
      this.logger.error({ msg: `Couldn't get all records`, error });
      return next(error);
    }
  };

  public get: GetRequestHandler = async (req, res, next) => {
    const { identifier } = req.params;
    try {
      const metadata: Metadata = await this.manager.getRecord(identifier);
      return res.status(httpStatus.OK).json(metadata);
    } catch (error) {
      this.logger.error({ msg: `Couldn't get record`, error });
      return next(error);
    }
  };

  public post: CreateRequestHandler = async (req, res, next) => {
    const payload: IPayload = req.body;
    try {
      const createdMetadata = await this.manager.createRecord(payload);
      this.createdResourceCounter.add(1);
      return res.status(httpStatus.CREATED).json(createdMetadata);
    } catch (error) {
      this.logger.error({ msg: `Couldn't post record`, error });
      return next(error);
    }
  };

  public patch: UpdatePartialRequestHandler = async (req, res, next) => {
    const { identifier } = req.params;
    try {
      const payload: IUpdatePayload = req.body;
      const updatedPartialMetadata = await this.manager.updateRecord(identifier, payload);
      return res.status(httpStatus.OK).json(updatedPartialMetadata);
    } catch (error) {
      this.logger.error({ msg: `Couldn't patch record`, error });
      return next(error);
    }
  };

  public delete: DeleteRequestHandler = async (req, res, next) => {
    try {
      const { identifier } = req.params;
      await this.manager.deleteRecord(identifier);
      return res.sendStatus(httpStatus.NO_CONTENT);
    } catch (error) {
      this.logger.error({ msg: `Couldn't delete record`, error });
      return next(error);
    }
  };

  public updateStatus: UpdateStatusRequestHandler = async (req, res, next) => {
    try {
      const { identifier } = req.params;
      const payload: IUpdateStatus = req.body;
      const record = await this.manager.updateStatusRecord(identifier, payload);
      return res.status(httpStatus.OK).json(record);
    } catch (error) {
      this.logger.error({ msg: `Couldn't patch status of record`, error });
      return next(error);
    }
  };
}

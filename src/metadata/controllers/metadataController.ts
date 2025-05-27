import { Logger } from '@map-colonies/js-logger';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { MetadataManager } from '../models/metadataManager';
import { Metadata } from '../../DAL/entities/metadata';
import { IFindRecordsPayload, IUpdatePayload, IUpdateStatus, LogContext, MetadataParams } from '../../common/interfaces';
import { IPayload } from '../../common/types';

type GetAllRequestHandler = RequestHandler<undefined, Metadata[]>;
type GetRequestHandler = RequestHandler<MetadataParams, Metadata, number>;
type FindLastVersionRequestHandler = RequestHandler<MetadataParams, number, number>;
type CreateRequestHandler = RequestHandler<undefined, Metadata, IPayload>;
type FindRecordsRequestHandler = RequestHandler<undefined, Metadata[], IFindRecordsPayload>;
type UpdatePartialRequestHandler = RequestHandler<MetadataParams, Metadata, IUpdatePayload>;
type DeleteRequestHandler = RequestHandler<MetadataParams>;
type UpdateStatusRequestHandler = RequestHandler<MetadataParams, Metadata, IUpdateStatus>;

@injectable()
export class MetadataController {
  private readonly logContext: LogContext;

  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(MetadataManager) private readonly manager: MetadataManager) {
    this.logContext = {
      fileName: __filename,
      class: MetadataController.name,
    };
  }

  public getAll: GetAllRequestHandler = async (req, res, next) => {
    const logContext = { ...this.logContext, function: this.getAll.name };
    try {
      const metadataList = await this.manager.getAll();
      if (!metadataList || metadataList.length == 0) {
        this.logger.info({
          msg: 'No Data found',
          logContext,
        });
        return res.sendStatus(httpStatus.NO_CONTENT);
      }
      return res.status(httpStatus.OK).json(metadataList);
    } catch (err) {
      this.logger.error({
        msg: `Couldn't get all records`,
        logContext,
        err,
      });
      return next(err);
    }
  };

  public get: GetRequestHandler = async (req, res, next) => {
    const logContext = { ...this.logContext, function: this.get.name };
    const { identifier } = req.params;
    try {
      const metadata: Metadata = await this.manager.getRecord(identifier);
      return res.status(httpStatus.OK).json(metadata);
    } catch (err) {
      this.logger.error({
        msg: `Couldn't get record`,
        logContext,
        err,
      });
      return next(err);
    }
  };

  public findLastVersion: FindLastVersionRequestHandler = async (req, res, next) => {
    const logContext = { ...this.logContext, function: this.findLastVersion.name };
    const { identifier } = req.params;
    try {
      const version: number = await this.manager.findLastVersion(identifier);
      return res.status(httpStatus.OK).json(version);
    } catch (err) {
      this.logger.error({
        msg: `Couldn't find last version of productID`,
        logContext,
        err,
      });
      return next(err);
    }
  };

  public post: CreateRequestHandler = async (req, res, next) => {
    const logContext = { ...this.logContext, function: this.post.name };
    const payload: IPayload = req.body;
    try {
      const createdMetadata = await this.manager.createRecord(payload);
      return res.status(httpStatus.CREATED).json(createdMetadata);
    } catch (err) {
      this.logger.error({
        msg: `Couldn't post record`,
        logContext,
        err,
      });
      return next(err);
    }
  };

  public findRecords: FindRecordsRequestHandler = async (req, res, next) => {
    const logContext = { ...this.logContext, function: this.findRecords.name };
    try {
      const payload: IFindRecordsPayload = req.body;
      const metadataList = await this.manager.findRecords(payload);
      return res.status(httpStatus.OK).json(metadataList);
    } catch (err) {
      this.logger.error({
        msg: `Find records failed`,
        logContext,
        err,
      });
      return next(err);
    }
  };

  public patch: UpdatePartialRequestHandler = async (req, res, next) => {
    const logContext = { ...this.logContext, function: this.patch.name };
    const { identifier } = req.params;
    try {
      const payload: IUpdatePayload = req.body;
      const updatedPartialMetadata = await this.manager.updateRecord(identifier, payload);
      return res.status(httpStatus.OK).json(updatedPartialMetadata);
    } catch (err) {
      this.logger.error({
        msg: `Couldn't patch record`,
        logContext,
        err,
      });
      return next(err);
    }
  };

  public delete: DeleteRequestHandler = async (req, res, next) => {
    const logContext = { ...this.logContext, function: this.delete.name };
    try {
      const { identifier } = req.params;
      await this.manager.deleteRecord(identifier);
      return res.sendStatus(httpStatus.NO_CONTENT);
    } catch (err) {
      this.logger.error({
        msg: `Couldn't delete record`,
        logContext,
        err,
      });
      return next(err);
    }
  };

  public updateStatus: UpdateStatusRequestHandler = async (req, res, next) => {
    const logContext = { ...this.logContext, function: this.updateStatus.name };
    try {
      const { identifier } = req.params;
      const payload: IUpdateStatus = req.body;
      const record = await this.manager.updateStatusRecord(identifier, payload);
      return res.status(httpStatus.OK).json(record);
    } catch (err) {
      this.logger.error({
        msg: `Couldn't patch status of record`,
        logContext,
        err,
      });
      return next(err);
    }
  };
}

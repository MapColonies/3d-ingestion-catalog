import * as turf from '@turf/turf';
import wkt from 'terraformer-wkt-parser';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { v4 as uuidV4 } from 'uuid';
import { Logger } from '@map-colonies/js-logger';
import { RecordStatus } from '@map-colonies/mc-model-types';
import { SERVICES } from '../../common/constants';
import { HttpError, NotFoundError } from '../../common/errors';
import { EntityNotFoundError, IdAlreadyExistsError } from '../models/errors';
import { MetadataManager } from '../models/metadataManager';
import { Metadata } from '../models/generated';
import { IPayload, IUpdate, IUpdateMetadata, IUpdatePayload, MetadataParams } from '../../common/dataModels/records';
import { linksToString, formatStrings } from '../../common/utils/format';
import { BadValues, IdNotExists } from './errors';

//Changed
type GetAllRequestHandler = RequestHandler<undefined, Metadata[]>;
type GetRequestHandler = RequestHandler<MetadataParams, Metadata, number>;
type CreateRequestHandler = RequestHandler<undefined, Metadata, IPayload>;
// type UpdateRequestHandler = RequestHandler<MetadataParams, Metadata, IPayload>;
type UpdatePartialRequestHandler = RequestHandler<MetadataParams, Metadata, IUpdatePayload>;
type DeleteRequestHandler = RequestHandler<MetadataParams>;

@injectable()
export class MetadataController {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, private readonly manager: MetadataManager) {}

  public getAll: GetAllRequestHandler = async (req, res, next) => {
    try {
      const metadataList = await this.manager.getAll();
      if (!metadataList || metadataList.length == 0) {
        return res.sendStatus(httpStatus.NO_CONTENT);
      }
      return res.status(httpStatus.OK).json(metadataList);
    } catch (error) {
      return next(error);
    }
  };

  public get: GetRequestHandler = async (req, res, next) => {
    try {
      const { identifier } = req.params;
      const metadata: Metadata | undefined = await this.manager.getRecord(identifier);
      if (!metadata) {
        const error = new NotFoundError(`Metadata record with identifier ${identifier} was not found.`);
        return next(error);
      }
      return res.status(httpStatus.OK).json(metadata);
    } catch (error) {
      return next(error);
    }
  };

  public post: CreateRequestHandler = async (req, res, next) => {
    try {
      const payload: IPayload = formatStrings<IPayload>(req.body);
      const metadata = await this.metadataToEntity(payload);

      const createdMetadata = await this.manager.createRecord(metadata);
      return res.status(httpStatus.CREATED).json(createdMetadata);
    } catch (error) {
      if (error instanceof IdAlreadyExistsError) {
        (error as HttpError).status = httpStatus.UNPROCESSABLE_ENTITY;
      } else if (error instanceof BadValues || error instanceof IdNotExists) {
        (error as HttpError).status = httpStatus.BAD_REQUEST;
      }
      return next(error);
    }
  };

  // public put: UpdateRequestHandler = async (req, res, next) => {
  //   try {
  //     const { identifier } = req.params;
  //     const payload: IPayload = formatStrings<IPayload>(req.body);
  //     const metadata = await this.metadataToEntity(payload);

  //     const updatedMetadata = await this.manager.updateRecord(identifier, metadata);
  //     return res.status(httpStatus.OK).json(updatedMetadata);
  //   } catch (error) {
  //     if (error instanceof EntityNotFoundError) {
  //       (error as HttpError).status = httpStatus.NOT_FOUND;
  //     }
  //     return next(error);
  //   }
  // };

  public patch: UpdatePartialRequestHandler = async (req, res, next) => {
    try {
      const { identifier } = req.params;
      const payload: IUpdatePayload = formatStrings<IUpdatePayload>(req.body);
      const metadata: IUpdateMetadata = this.updatePayloadToMatadata(identifier, payload);

      const updatedPartialMetadata = await this.manager.updatePartialRecord(metadata);
      return res.status(httpStatus.OK).json(updatedPartialMetadata);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        (error as HttpError).status = httpStatus.NOT_FOUND;
      }
      return next(error);
    }
  };

  public delete: DeleteRequestHandler = async (req, res, next) => {
    try {
      const { identifier } = req.params;
      await this.manager.deleteRecord(identifier);
      return res.sendStatus(httpStatus.NO_CONTENT);
    } catch (error) {
      return next(error);
    }
  };

  private async metadataToEntity(payload: IPayload): Promise<Metadata> {
    const id = uuidV4();

    await this.checkValuesValidation(payload, id);

    const entity: Metadata = new Metadata();
    Object.assign(entity, payload);

    entity.id = id;
    if (payload.productId != undefined) {
      entity.productVersion = (await this.manager.findLastVersion(payload.productId)) + 1;
    } else {
      entity.productVersion = 1;
      entity.productId = id;
    }

    if (payload.footprint !== undefined) {
      entity.wktGeometry = wkt.convert(payload.footprint as GeoJSON.Geometry);
      entity.productBoundingBox = turf.bbox(payload.footprint).toString();
    }

    entity.sensors = payload.sensors ? payload.sensors.join(', ') : '';
    entity.region = payload.region ? payload.region.join(', ') : '';
    entity.links = linksToString(payload.links);

    entity.updateDate = new Date();
    entity.insertDate = new Date();

    return entity;
  }

  private updatePayloadToMatadata(identifier: string, payload: IUpdatePayload): IUpdateMetadata {
    const metadata: IUpdateMetadata = {
      ...(payload as IUpdate),
      id: identifier,
      updateDate: new Date(),
      ...(payload.sensors && { sensors: payload.sensors.join(', ') }),
      productStatus: RecordStatus.UNPUBLISHED,
    };

    return metadata;
  }

  private async checkValuesValidation(payload: IPayload, id: string): Promise<void> {
    // Validates that generated id doesn't exists. If exists, go fill a lottery card now!
    if (await this.manager.getRecord(id)) {
      throw new IdAlreadyExistsError(`Metadata record ${id} already exists!`);
    }

    // Validates that productId exists (when is not null)
    if (payload.productId != undefined) {
      if (!(await this.manager.getRecord(payload.productId))) {
        throw new IdNotExists(`productId ${payload.productId} doesn't exist`);
      }
    }

    // Written just to please eslint... Must be filled and openapi validates it.
    if (payload.sourceDateStart == undefined || payload.sourceDateEnd == undefined) {
      throw new BadValues('must enter dates!');
    }

    // Validates that startDate isn't later than endDate
    if (payload.sourceDateStart > payload.sourceDateEnd) {
      throw new BadValues('sourceStartDate should not be later than sourceEndDate');
    }

    // Validates that the condition is relevant by checking if both of them are filled
    if (payload.minResolutionMeter != undefined && payload.maxResolutionMeter != undefined) {
      // Validates that minRes isn't bigger than maxRes
      if (payload.minResolutionMeter > payload.maxResolutionMeter) {
        throw new BadValues('minResolutionMeter should not be bigger than maxResolutionMeter');
      }
    }
  }
}

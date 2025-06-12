import jsLogger from '@map-colonies/js-logger';
import { faker } from '@faker-js/faker';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { register } from 'prom-client';
import { Metadata } from '../../../src/DAL/entities/metadata';
import { createUuid, createMetadata, createPayload, createUpdatePayload, createUpdateStatus } from '../../helpers/helpers';
import { SERVICES } from '../../../src/common/constants';
import { IFindRecordsPayload, IUpdatePayload, IUpdateStatus } from '../../../src/common/interfaces';
import { IPayload } from '../../../src/common/types';
import { repositoryMock } from '../../helpers/mockCreators';
import { getApp } from '../../../src/app';
import { MetadataRequestSender } from './helpers/requestSender';

describe('MetadataController', function () {
  let requestSender: MetadataRequestSender;

  beforeEach(async function () {
    const app = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
    register.clear();
    requestSender = new MetadataRequestSender(app);
  });

  afterEach(() => {
    register.clear();
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('GET /metadata', function () {
    describe('Happy Path 🙂', function () {
      it('should return 204 if there are no metadata records', async function () {
        const response = await requestSender.getAll();

        expect(response.status).toBe(httpStatusCodes.NO_CONTENT);
      });

      it('should return 200 status code and a metadata records list', async function () {
        const payload = createPayload();
        const createResponse = await requestSender.createRecord(payload);

        const response = await requestSender.getAll();

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(response.body).toHaveLength(1);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createResponseWithoutAnyText } = createResponse.body as Metadata;
        expect(response.body).toMatchObject([createResponseWithoutAnyText]);
      });
    });

    describe('Bad Path 😡', function () {
      // No bad paths here!
    });

    describe('Sad Path 😥', function () {
      it('should return 500 status code if a db exception happens', async function () {
        const app = await getApp({
          override: [
            { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
            { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
        repositoryMock.find.mockRejectedValue(new Error());

        const response = await requestSender.getAll();

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'Problem with the DB');
      });
    });
  });

  describe('POST /metadata/find', function () {
    describe('Happy Path 🙂', function () {
      it('should return 200 status code and empty array if there are no metadata records', async function () {
        const payload = createPayload();
        await requestSender.createRecord(payload);
        const response = await requestSender.find({ productName: payload.productName + '_test' });
        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.body).toEqual([]);
        expect(response.body).toHaveLength(0);
      });

      it('should return 200 status code and a metadata records list that matches the find payload', async function () {
        const payload = createPayload();
        const createResponse = await requestSender.createRecord(payload);
        const response = await requestSender.find({ productName: payload.productName });
        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.body).toHaveLength(1);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete response.body[0]?.footprint;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete createResponse.body?.footprint;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete response.body[0]?.anyText;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete createResponse.body?.anyText;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete response.body[0]?.anyTextTsvector;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        delete createResponse.body?.anyTextTsvector;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(createResponse.body).toEqual(response.body[0]);
      });
    });

    describe('Bad Path 😡', function () {
      it('should return 500 status code if a db exception happens', async function () {
        const app = await getApp({
          override: [
            { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
            { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
        const response = await requestSender.find({ bla: 1 } as IFindRecordsPayload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toHaveProperty('message', 'request/body must NOT have additional properties');
      });
    });

    describe('Sad Path 😥', function () {
      it('should return 500 status code if a db exception happens', async function () {
        const app = await getApp({
          override: [
            { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
            { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
        repositoryMock.createQueryBuilder.mockReturnValue(new Error());

        const response = await requestSender.find({});

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'Problem with the DB');
      });
    });
  });

  describe('GET /metadata/{identifier}', function () {
    describe('Happy Path 🙂', function () {
      it('should return 200 status code and the metadata record', async function () {
        const payload = createPayload();
        const createResponse = await requestSender.createRecord(payload);
        const id = (createResponse.body as Metadata).id;

        const response = await requestSender.getRecord(id);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createResponseWithoutAnyText } = createResponse.body as Metadata;
        expect(response.body).toMatchObject(createResponseWithoutAnyText);
      });
    });

    describe('Bad Path 😡', function () {
      it('should return 404 if a metadata record with the requested identifier does not exist', async function () {
        const id = createUuid();

        const response = await requestSender.getRecord(id);

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        expect(response.body).toHaveProperty('message', `Identifier ${id} wasn't found on DB`);
      });
    });

    describe('Sad Path 😥', function () {
      it('should return 500 status code if a db exception happens', async function () {
        const app = await getApp({
          override: [
            { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
            { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
        repositoryMock.findOne.mockRejectedValue(new Error());

        const response = await requestSender.getRecord(createUuid());

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'Problem with the DB');
      });
    });
  });

  describe('GET /metadata/lastVersion/{identifier}', function () {
    describe('Happy Path 🙂', function () {
      it('should return 0 if productID does not exist in DB', async function () {
        const productID = createUuid();

        const response = await requestSender.findLastVersion(productID);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(response.body).toBe(0);
      });

      it('should return last version if productID exists in DB', async function () {
        const payload = createPayload();
        const createResponse = await requestSender.createRecord(payload);

        const response = await requestSender.findLastVersion((createResponse.body as Metadata).productId);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(response.body).toBe(1);
      });
    });

    describe('Sad Path 😥', function () {
      it('should return 500 status code if a db exception happens', async function () {
        const app = await getApp({
          override: [
            { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
            { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
        repositoryMock.findOne.mockRejectedValue(new Error());

        const response = await requestSender.findLastVersion(createUuid());

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'Problem with the DB');
      });
    });
  });

  describe('POST /metadata', function () {
    describe('Happy Path 🙂', function () {
      it('if productId not exists, should return 201 status code and the added metadata record when productVersion = 1', async function () {
        const payload = createPayload();
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);

        const body = response.body as Metadata;
        const getResponse = await requestSender.getRecord(body.id);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createdResponseBody } = body;

        expect(getResponse.body).toMatchObject(createdResponseBody);
        expect(createdResponseBody.productVersion).toBe(1);
      });

      it('if productId exists, should return 201 status code and the added metadata record when productVersion is + 1', async function () {
        const payload = createPayload();
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        const oldBody = response.body as Metadata;
        payload.productId = oldBody.productId;
        payload.id = createUuid();
        payload.productName = faker.word.sample();
        const newResponse = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        const body = newResponse.body as Metadata;

        const getResponse = await requestSender.getRecord(body.id);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createdResponseBody } = body;

        expect(getResponse.body).toMatchObject(createdResponseBody);
        expect(createdResponseBody.productId).toBe(oldBody.productId);
        expect(createdResponseBody.productVersion).toBe(Number(oldBody.productVersion) + 1);
      });

      it("if region contains string with a ', should return 201 status code and the added metadata record as expected", async function () {
        const payload = createPayload();
        payload.region = ["st'rng"];
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        const body = response.body as Metadata;

        const getResponse = await requestSender.getRecord(body.id);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createdResponseBody } = body;

        expect(getResponse.body).toMatchObject(createdResponseBody);
      });
    });

    describe('Bad Path 😡', function () {
      it('should return 400 status code if id is not exists or null', async function () {
        const payload = createPayload();
        payload.id = null as unknown as string;

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toHaveProperty('message', `request/body/id must be string`);
      });

      it('should return 400 status code if has property that is not in post scheme', async function () {
        const entity = { avi: 'aviavi' };
        const payload: IPayload = createPayload();
        Object.assign(payload, entity);

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request/body must NOT have additional properties`);
      });

      it('should return 400 status code if region not exists', async function () {
        const payload = createPayload();
        payload.region = undefined;

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request/body must have required property 'region'`);
      });

      it('should return 400 status code if region is empty', async function () {
        const payload = createPayload();
        payload.region = [];

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request/body/region must NOT have fewer than 1 items`);
      });

      it('should return 400 status code if sensors not exists', async function () {
        const payload = createPayload();
        payload.sensors = undefined;

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request/body must have required property 'sensors'`);
      });

      it('should return 400 status code if sensors is empty', async function () {
        const payload = createPayload();
        payload.sensors = [];

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request/body/sensors must NOT have fewer than 1 items`);
      });
    });

    describe('Sad Path 😥', function () {
      it('should return 500 status code if a db exception happens', async function () {
        const app = await getApp({
          override: [
            { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
            { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
        const payload = createPayload();
        payload.productId = createUuid();
        repositoryMock.findOne.mockRejectedValue(new Error());

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'Problem with the DB');
      });

      it('if productName already exists, should return 500 status code', async function () {
        const payload = createPayload();
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);

        payload.id = createUuid();
        const newResponse = await requestSender.createRecord(payload);
        expect(newResponse.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
      });
    });
  });

  describe('PATCH /metadata/{identifier}', function () {
    describe('Happy Path 🙂', function () {
      it('should return 200 status code and the updated metadata record', async function () {
        const payload = createPayload();
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        const record = response.body as Metadata;
        const updatePayload = createUpdatePayload();

        const updateResponse = await requestSender.updateRecord(record.id, updatePayload);
        const updatedRecord = updateResponse.body as Metadata;

        expect(updateResponse.status).toBe(httpStatusCodes.OK);
        expect(updateResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(updatedRecord.description).toBe(updatePayload.description);
        expect(updatedRecord.footprint).not.toEqual(record.footprint);
        expect(updatedRecord.footprint).toEqual(updatePayload.footprint);
        expect(updatedRecord.wktGeometry).not.toStrictEqual(record.wktGeometry);
      });

      it('should return 200 status code when there is no sensors', async function () {
        const payload: IPayload = createPayload();
        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');

        const responseBody = response.body as Metadata;
        const id = responseBody.id;
        const updatedPayload: IUpdatePayload = createUpdatePayload();
        delete updatedPayload.sensors;

        const updateResponse = await requestSender.updateRecord(id, updatedPayload);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...updatedResponseBody } = updateResponse.body as Metadata;

        expect(updateResponse.status).toBe(httpStatusCodes.OK);
        expect(updateResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(updatedResponseBody.sensors).toBe(responseBody.sensors);
      });

      it('should return 200 status code when there is no footprint', async function () {
        const payload: IPayload = createPayload();
        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.CREATED);

        const record = response.body as Metadata;
        const updatedPayload: IUpdatePayload = createUpdatePayload();
        delete updatedPayload.footprint;

        const updateResponse = await requestSender.updateRecord(record.id, updatedPayload);
        const updatedRecord = updateResponse.body as Metadata;

        expect(updateResponse.status).toBe(httpStatusCodes.OK);
        expect(JSON.parse(String(updatedRecord.footprint))).toEqual(record.footprint);
      });
    });

    describe('Bad Path 😡', function () {
      it('should return 404 status code if the metadata record does not exist', async function () {
        const metadata = createMetadata();
        const payload = createUpdatePayload();

        const response = await requestSender.updateRecord(metadata.id, payload);

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        expect(response.body).toHaveProperty('message', `Identifier ${metadata.id} wasn't found on DB`);
      });

      it('should return 400 status code if has property that is not in update scheme', async function () {
        const payload: IPayload = createPayload();
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const responseBody = response.body as Metadata;
        const id = responseBody.id;
        const updatedPayload: IUpdatePayload = createUpdatePayload();
        const entity = { avi: 'aviavi' };
        Object.assign(updatedPayload, entity);

        const newResponse = await requestSender.updateRecord(id, updatedPayload);

        expect(newResponse.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(newResponse.text).toContain(`request/body must NOT have additional properties`);
      });

      it('should return 400 status code if sensors is null', async function () {
        const payload: IPayload = createPayload();
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const responseBody = response.body as Metadata;
        const id = responseBody.id;
        const updatedPayload: IUpdatePayload = createUpdatePayload();
        const entity = { sensors: null };
        Object.assign(updatedPayload, entity);
        const newResponse = await requestSender.updateRecord(id, updatedPayload);

        expect(newResponse.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(newResponse.text).toContain(`request/body/sensors must be array`);
      });
    });

    describe('Sad Path 😥', function () {
      it('should return 500 status code if a db exception happens', async function () {
        const app = await getApp({
          override: [
            { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
            { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
        const metadata = createMetadata();
        const payload = createUpdatePayload();
        repositoryMock.findOne.mockRejectedValue(new Error());

        const response = await requestSender.updateRecord(metadata.id, payload);

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'Problem with the DB');
      });
    });
  });

  describe('DELETE /metadata/{identifier}', function () {
    describe('Happy Path 🙂', function () {
      it('should return 204 status code if metadata record to be deleted was not in the database', async function () {
        const response = await requestSender.deleteRecord(createUuid());

        expect(response.status).toBe(httpStatusCodes.NO_CONTENT);
      });

      it('should return 204 status code if metadata record was found and deleted successfully', async function () {
        const payload = createPayload();

        const created = await requestSender.createRecord(payload);
        const metadata = created.body as Metadata;

        const response = await requestSender.deleteRecord(metadata.id);

        expect(response.status).toBe(httpStatusCodes.NO_CONTENT);
      });
    });

    describe('Bad Path 😡', function () {
      // No bad paths here!
    });

    describe('Sad Path 😥', function () {
      beforeEach(async function () {
        const app = await getApp({
          override: [
            { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
            { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
      });

      it('should return 500 status code if a db exception happens', async function () {
        repositoryMock.delete.mockRejectedValue(new Error());

        const response = await requestSender.deleteRecord(createUuid());

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'Problem with the DB');
      });
    });
  });

  describe('PATCH /metadata/status/{identifier}', function () {
    describe('Happy Path 🙂', function () {
      it('should return 200 status code and the updated status record', async function () {
        const payload: IPayload = createPayload();
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const id = (response.body as Metadata).id;
        const updatedPayload: IUpdateStatus = createUpdateStatus();

        const updateResponse = await requestSender.updateStatusRecord(id, updatedPayload);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...updatedResponseBody } = updateResponse.body as Metadata;

        expect(updateResponse.status).toBe(httpStatusCodes.OK);
        expect(updateResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(updatedResponseBody.productStatus).toBe(updatedPayload.productStatus);
      });
    });

    describe('Bad Path 😡', function () {
      it('should return 404 status code if the metadata record does not exist', async function () {
        const id = createUuid();
        const payload = createUpdateStatus();

        const response = await requestSender.updateStatusRecord(id, payload);

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        expect(response.body).toHaveProperty('message', `Identifier ${id} wasn't found on DB`);
      });

      it('should return 400 status code if has property that is not in update scheme', async function () {
        const payload: IPayload = createPayload();

        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        const responseBody = response.body as Metadata;
        const id = responseBody.id;
        const updatedPayload: IUpdateStatus = createUpdateStatus();

        const entity = { avi: 'aviavi' };
        Object.assign(updatedPayload, entity);

        const newResponse = await requestSender.updateStatusRecord(id, updatedPayload);

        expect(newResponse.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(newResponse.text).toContain(`request/body must NOT have additional properties`);
      });

      it('should return 400 status code if productStatus is null', async function () {
        const payload: IPayload = createPayload();

        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const responseBody = response.body as Metadata;
        const id = responseBody.id;
        const updatedPayload: IUpdateStatus = createUpdateStatus();
        const entity = { productStatus: null };
        Object.assign(updatedPayload, entity);

        const newResponse = await requestSender.updateStatusRecord(id, updatedPayload);

        expect(newResponse.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(newResponse.text).toContain(`request/body/productStatus must be string`);
      });
    });

    describe('Sad Path 😥', function () {
      beforeEach(async function () {
        const app = await getApp({
          override: [
            { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
      });

      it('should return 500 status code if a db exception happens', async function () {
        const metadata = createMetadata();
        const payload = createUpdateStatus();
        repositoryMock.findOne.mockRejectedValue(new Error());

        const response = await requestSender.updateStatusRecord(metadata.id, payload);

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'Problem with the DB');
      });
    });
  });
});

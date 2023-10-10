import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { Application } from 'express';
import { QueryFailedError } from 'typeorm';
import config from 'config';
import { Connection } from 'typeorm';
import jsLogger from '@map-colonies/js-logger';
import { Metadata } from '../../../../src/metadata/models/generated';
import { createFakeID, createFakeMetadata, createFakePayload, createFakeUpdatePayload, createFakeUpdateStatus } from '../../../helpers/helpers';
import { DbConfig } from '../../../../src/common/interfaces';
import { initializeConnection } from '../../../../src/common/utils/db';
import { SERVICES } from '../../../../src/common/constants';
import { IPayload, IUpdatePayload, IUpdateStatus } from '../../../../src/common/dataModels/records';
import * as requestSender from './helpers/requestSender';

describe('MetadataController', function () {
  let app: Application;
  let connection: Connection;

  beforeAll(async function () {
    container.register(SERVICES.CONFIG, { useValue: config });

    container.register(SERVICES.LOGGER, { useValue: jsLogger({ enabled: false }) });

    connection = await initializeConnection(config.get<DbConfig>('test'));
    await connection.synchronize();
    const repository = connection.getRepository(Metadata);
    container.register(Connection, { useValue: connection });
    container.register(SERVICES.METADATA_REPOSITORY, { useValue: repository });

    app = requestSender.getApp();
  });

  afterAll(async function () {
    await connection.close();
  });

  describe('GET /metadata', function () {
    describe('Happy Path 🙂', function () {
      it('should return 204 if there are no metadata records', async function () {
        const response = await requestSender.getAll(app);

        expect(response.status).toBe(httpStatusCodes.NO_CONTENT);
      });

      it('should return 200 status code and a metadata records list', async function () {
        const payload = createFakePayload();

        const createResponse = await requestSender.createRecord(app, payload);
        expect(createResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const response = await requestSender.getAll(app);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(response.body).toHaveLength(1);

        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createResponseWithoutAnyText } = createResponse.body as unknown as Metadata;
        expect(response.body).toMatchObject([createResponseWithoutAnyText]);
      });
    });

    describe('Bad Path 😡', function () {
      // No bad paths here!
    });

    describe('Sad Path 😥', function () {
      it('should return 500 status code if a db exception happens', async function () {
        const findMock = jest.fn().mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));
        const mockedApp = requestSender.getMockedRepoApp({ find: findMock });

        const response = await requestSender.getAll(mockedApp);

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'failed');
      });
    });
  });

  describe('GET /metadata/{identifier}', function () {
    describe('Happy Path 🙂', function () {
      it('should return 200 status code and the metadata record', async function () {
        const payload = createFakePayload();

        const createResponse = await requestSender.createRecord(app, payload);
        expect(createResponse.status).toBe(httpStatusCodes.CREATED);
        expect(createResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');

        const id = (createResponse.body as unknown as Metadata).id;
        const response = await requestSender.getRecord(app, id);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');

        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createResponseWithoutAnyText } = createResponse.body as unknown as Metadata;
        expect(response.body).toMatchObject(createResponseWithoutAnyText);
      });
    });

    describe('Bad Path 😡', function () {
      it('should return 404 if a metadata record with the requested identifier does not exist', async function () {
        const response = await requestSender.getRecord(app, '1');

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        expect(response.body).toHaveProperty('message', `Metadata record with identifier 1 was not found.`);
      });
    });

    describe('Sad Path 😥', function () {
      it('should return 500 status code if a db exception happens', async function () {
        const findMock = jest.fn().mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));
        const mockedApp = requestSender.getMockedRepoApp({ findOne: findMock });

        const response = await requestSender.getRecord(mockedApp, '1');

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'failed');
      });
    });
  });

  describe('POST /metadata', function () {
    describe('Happy Path 🙂', function () {
      it('if productId not exists, should return 201 status code and the added metadata record when productVersion = 1', async function () {
        const payload = createFakePayload();
        const response = await requestSender.createRecord(app, payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');

        const body = response.body as unknown as Metadata;
        const getResponse = await requestSender.getRecord(app, body.id);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createdResponseBody } = body;

        expect(getResponse.body).toMatchObject(createdResponseBody);
        expect(createdResponseBody.productVersion).toBe(1);
      });

      it('if productId exists, should return 201 status code and the added metadata record when productVersion is + 1', async function () {
        const payload = createFakePayload();
        const response = await requestSender.createRecord(app, payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const oldBody = response.body as unknown as Metadata;
        payload.productId = oldBody.productId;
        payload.id = createFakeID();
        const newResponse = await requestSender.createRecord(app, payload);
        expect(newResponse.status).toBe(httpStatusCodes.CREATED);
        expect(newResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const body = newResponse.body as unknown as Metadata;

        const getResponse = await requestSender.getRecord(app, body.id);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createdResponseBody } = body;

        expect(getResponse.body).toMatchObject(createdResponseBody);
        expect(createdResponseBody.productId).toBe(oldBody.productId);
        expect(createdResponseBody.productVersion).toBe(Number(oldBody.productVersion) + 1);
      });

      it("if region contains string with a ', should return 201 status code and the added metadata record as expected", async function () {
        const payload = createFakePayload();
        payload.region = ["st'rng"];
        const response = await requestSender.createRecord(app, payload);

        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');

        const body = response.body as unknown as Metadata;
        const getResponse = await requestSender.getRecord(app, body.id);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createdResponseBody } = body;

        expect(getResponse.body).toMatchObject(createdResponseBody);
      });
    });

    describe('Bad Path 😡', function () {
      it('should return 400 status code if id is not exists or null', async function () {
        const payload = createFakePayload();
        payload.id = null as unknown as string;

        const response = await requestSender.createRecord(app, payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request.body.id should be string`);
      });

      it('should return 400 status code if productId is not exists', async function () {
        const payload = createFakePayload();
        payload.productId = '2';

        const response = await requestSender.createRecord(app, payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`productId ${payload.productId} doesn't exist`);
      });

      it('should return 400 status code if has property that is not in post scheme', async function () {
        const entity = { avi: 'aviavi' };
        const payload: IPayload = createFakePayload();
        Object.assign(payload, entity);

        const response = await requestSender.createRecord(app, payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request.body should NOT have additional properties`);
      });

      it('should return 400 status code if sourceStartDate is later than sourceEndDate', async function () {
        const payload = createFakePayload();
        const temp = payload.sourceDateStart;
        payload.sourceDateStart = payload.sourceDateEnd;
        payload.sourceDateEnd = temp;

        const response = await requestSender.createRecord(app, payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain('sourceStartDate should not be later than sourceEndDate');
      });

      it('should return 400 status code if minResolutionMeter is bigger than maxResolutionMeter', async function () {
        // Part 1 - preparing data
        const payload = createFakePayload();
        const temp = payload.minResolutionMeter;
        payload.minResolutionMeter = payload.maxResolutionMeter;
        payload.maxResolutionMeter = temp;

        const response = await requestSender.createRecord(app, payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain('minResolutionMeter should not be bigger than maxResolutionMeter');
      });

      it('should return 400 status code if region not exists', async function () {
        const payload = createFakePayload();
        payload.region = undefined;

        const response = await requestSender.createRecord(app, payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request.body should have required property 'region'`);
      });

      it('should return 400 status code if region is empty', async function () {
        const payload = createFakePayload();
        payload.region = [];

        const response = await requestSender.createRecord(app, payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request.body.region should NOT have fewer than 1 items`);
      });

      it('should return 400 status code if sensors not exists', async function () {
        const payload = createFakePayload();
        payload.sensors = undefined;

        const response = await requestSender.createRecord(app, payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request.body should have required property 'sensors'`);
      });

      it('should return 400 status code if sensors is empty', async function () {
        const payload = createFakePayload();
        payload.sensors = [];

        const response = await requestSender.createRecord(app, payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request.body.sensors should NOT have fewer than 1 items`);
      });
    });

    describe('Sad Path 😥', function () {
      it('should return 422 status code if a metadata record with the same id already exists', async function () {
        const payload = createFakePayload();
        const findMock = jest.fn().mockResolvedValue(payload);
        const mockedApp = requestSender.getMockedRepoApp({ findOne: findMock });

        const response = await requestSender.createRecord(mockedApp, payload);
        expect(response.status).toBe(httpStatusCodes.UNPROCESSABLE_ENTITY);
        expect(response.body).toHaveProperty('message');
      });

      it('should return 500 status code if a db exception happens', async function () {
        const payload = createFakePayload();
        const findMock = jest.fn().mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));
        const mockedApp = requestSender.getMockedRepoApp({ findOne: findMock });

        const response = await requestSender.createRecord(mockedApp, payload);

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'failed');
      });
    });
  });

  /* eslint-disable */

  // describe('PUT /metadata/{identifier}', function () {
  //   describe('Happy Path 🙂', function () {
  //     it('should return 200 status code and the updated metadata record', async function () {
  //       const metadata = createFakeEntity();
  //       const findMock = jest.fn().mockResolvedValue(metadata);
  //       metadata.classification = '4';
  //       const saveMock = jest.fn().mockResolvedValue(metadata);
  //       const mockedApp = requestSender.getMockedRepoApp({ findOne: findMock, save: saveMock });
  //       const response = await requestSender.updateRecord(mockedApp, metadata.id, metadata);

  //       expect(response.status).toBe(httpStatusCodes.OK);
  //       expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
  //     });
  //   });

  //   describe('Bad Path 😡', function () {
  //     // No bad paths here!
  //   });

  //   describe('Sad Path 😥', function () {
  //     it('should return 404 status code if the metadata record does not exist', async function () {
  //       const metadata = createFakeEntity();
  //       const findMock = jest.fn().mockResolvedValue(undefined);
  //       const mockedApp = requestSender.getMockedRepoApp({ findOne: findMock });
  //       const response = await requestSender.updateRecord(mockedApp, metadata.id, metadata);

  //       expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
  //       expect(response.body).toHaveProperty('message', `Metadata record ${metadata.id} does not exist`);
  //     });

  //     it('should return 500 status code if a db exception happens', async function () {
  //       const metadata = createFakeEntity();
  //       const findMock = jest.fn().mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));
  //       const mockedApp = requestSender.getMockedRepoApp({ findOne: findMock });

  //       const response = await requestSender.updateRecord(mockedApp, metadata.id, metadata);

  //       expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
  //       expect(response.body).toHaveProperty('message', 'failed');
  //     });
  //   });
  // });

  /* eslint-enable */

  describe('PATCH /metadata/{identifier}', function () {
    describe('Happy Path 🙂', function () {
      it('should return 200 status code and the updated metadata record', async function () {
        const response = await requestSender.createRecord(app, createFakePayload());
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const id = (response.body as unknown as Metadata).id;
        const payload = createFakeUpdatePayload();

        const updateResponse = await requestSender.updatePartialRecord(app, id, payload);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...updatedResponseBody } = updateResponse.body as Metadata;

        expect(updateResponse.status).toBe(httpStatusCodes.OK);
        expect(updateResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(updatedResponseBody.description).toBe(payload.description);
      });

      it('should return 200 status code when there is no sensors', async function () {
        const response = await requestSender.createRecord(app, createFakePayload());
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const responseBody = response.body as unknown as Metadata;
        const id = responseBody.id;
        const payload = createFakeUpdatePayload();
        delete payload.sensors;

        const updateResponse = await requestSender.updatePartialRecord(app, id, payload);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...updatedResponseBody } = updateResponse.body as Metadata;

        expect(updateResponse.status).toBe(httpStatusCodes.OK);
        expect(updateResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(updatedResponseBody.sensors).toBe(responseBody.sensors);
      });
    });

    describe('Bad Path 😡', function () {
      it('should return 404 status code if the metadata record does not exist', async function () {
        const metadata = createFakeMetadata();
        const payload = createFakeUpdatePayload();

        const response = await requestSender.updatePartialRecord(app, metadata.id, payload);

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        expect(response.body).toHaveProperty('message', `Metadata record ${metadata.id} does not exist`);
      });

      it('should return 400 status code if has property that is not in update scheme', async function () {
        const response = await requestSender.createRecord(app, createFakePayload());
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const responseBody = response.body as unknown as Metadata;
        const id = responseBody.id;
        const payload: IUpdatePayload = createFakeUpdatePayload();
        const entity = { avi: 'aviavi' };
        Object.assign(payload, entity);

        const newResponse = await requestSender.updatePartialRecord(app, id, payload);

        expect(newResponse.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(newResponse.text).toContain(`request.body should NOT have additional properties`);
      });

      it('should return 400 status code if sensors is null', async function () {
        const response = await requestSender.createRecord(app, createFakePayload());
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const responseBody = response.body as unknown as Metadata;
        const id = responseBody.id;
        const payload: IUpdatePayload = createFakeUpdatePayload();
        const entity = { sensors: null };
        Object.assign(payload, entity);

        const newResponse = await requestSender.updatePartialRecord(app, id, payload);

        expect(newResponse.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(newResponse.text).toContain(`request.body.sensors should be array`);
      });
    });

    describe('Sad Path 😥', function () {
      it('should return 500 status code if a db exception happens', async function () {
        const metadata = createFakeMetadata();
        const payload = createFakeUpdatePayload();
        const findMock = jest.fn().mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));
        const mockedApp = requestSender.getMockedRepoApp({ findOne: findMock });

        const response = await requestSender.updatePartialRecord(mockedApp, metadata.id, payload);

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'failed');
      });
    });
  });

  describe('DELETE /metadata/{identifier}', function () {
    describe('Happy Path 🙂', function () {
      it('should return 204 status code if metadata record to be deleted was not in the database', async function () {
        const response = await requestSender.deleteRecord(app, '1');

        expect(response.status).toBe(httpStatusCodes.NO_CONTENT);
      });

      it('should return 204 status code if metadata record was found and deleted successfully', async function () {
        const payload = createFakePayload();
        const created = await requestSender.createRecord(app, payload);
        const metadata = created.body as Metadata;

        const response = await requestSender.deleteRecord(app, metadata.id);

        expect(response.status).toBe(httpStatusCodes.NO_CONTENT);
      });
    });

    describe('Bad Path 😡', function () {
      // No bad paths here!
    });

    describe('Sad Path 😥', function () {
      it('should return 500 status code if a db exception happens', async function () {
        const deleteMock = jest.fn().mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));
        const mockedApp = requestSender.getMockedRepoApp({ delete: deleteMock });

        const response = await requestSender.deleteRecord(mockedApp, '1');

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'failed');
      });
    });
  });

  describe('PATCH /metadata/status/{identifier}', function () {
    describe('Happy Path 🙂', function () {
      it('should return 200 status code and the updated status record', async function () {
        const response = await requestSender.createRecord(app, createFakePayload());
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const id = (response.body as unknown as Metadata).id;
        const payload: IUpdateStatus = createFakeUpdateStatus();

        const updateResponse = await requestSender.updateStatusRecord(app, id, payload);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...updatedResponseBody } = updateResponse.body as Metadata;

        expect(updateResponse.status).toBe(httpStatusCodes.OK);
        expect(updateResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(updatedResponseBody.productStatus).toBe(payload.productStatus);
      });
    });

    describe('Bad Path 😡', function () {
      it('should return 404 status code if the metadata record does not exist', async function () {
        const metadata = createFakeMetadata();
        const payload = createFakeUpdateStatus();

        const response = await requestSender.updateStatusRecord(app, metadata.id, payload);

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        expect(response.body).toHaveProperty('message', `Metadata record ${metadata.id} does not exist`);
      });

      it('should return 400 status code if has property that is not in update scheme', async function () {
        const response = await requestSender.createRecord(app, createFakePayload());
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const responseBody = response.body as unknown as Metadata;
        const id = responseBody.id;
        const payload: IUpdateStatus = createFakeUpdateStatus();
        const entity = { avi: 'aviavi' };
        Object.assign(payload, entity);

        const newResponse = await requestSender.updateStatusRecord(app, id, payload);

        expect(newResponse.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(newResponse.text).toContain(`request.body should NOT have additional properties`);
      });

      it('should return 400 status code if productStatus is null', async function () {
        const response = await requestSender.createRecord(app, createFakePayload());
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const responseBody = response.body as unknown as Metadata;
        const id = responseBody.id;
        const payload: IUpdateStatus = createFakeUpdateStatus();
        const entity = { productStatus: null };
        Object.assign(payload, entity);
        const newResponse = await requestSender.updateStatusRecord(app, id, payload);

        expect(newResponse.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(newResponse.text).toContain(`request.body.productStatus should be string`);
      });
    });

    describe('Sad Path 😥', function () {
      it('should return 500 status code if a db exception happens', async function () {
        const metadata = createFakeMetadata();
        const payload = createFakeUpdateStatus();
        const findMock = jest.fn().mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));
        const mockedApp = requestSender.getMockedRepoApp({ findOne: findMock });

        const response = await requestSender.updateStatusRecord(mockedApp, metadata.id, payload);

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'failed');
      });
    });
  });
});

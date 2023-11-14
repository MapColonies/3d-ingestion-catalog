import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import mockAxios from 'jest-mock-axios';
import { QueryFailedError } from 'typeorm';
import { randWord } from '@ngneat/falso';
import { Metadata } from '../../../src/metadata/models/generated';
import { createUuid, createFakeMetadata, createFakePayload, createFakeUpdatePayload, createFakeUpdateStatus } from '../../helpers/helpers';
import { SERVICES } from '../../../src/common/constants';
import { IUpdatePayload, IUpdateStatus } from '../../../src/common/interfaces';
import { IPayload } from '../../../src/common/types';
import { repositoryMock } from '../../helpers/mockCreators';
import { ILookupOption } from '../../../src/externalServices/lookUpTables/interfaces';
import { getApp } from '../../../src/app';
import { MetadataRequestSender } from './helpers/requestSender';

describe('MetadataController', function () {
  let requestSender: MetadataRequestSender;

  beforeEach(function () {
    const app = getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      // useChild: true,
    });
    requestSender = new MetadataRequestSender(app);
  });

  describe('GET /metadata', function () {
    describe('Happy Path 🙂', function () {
      it('should return 204 if there are no metadata records', async function () {
        const response = await requestSender.getAll();

        expect(response.status).toBe(httpStatusCodes.NO_CONTENT);
      });

      it('should return 200 status code and a metadata records list', async function () {
        const payload = createFakePayload();
        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });

        const createResponse = await requestSender.createRecord(payload);
        expect(createResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const response = await requestSender.getAll();

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
      beforeEach(function () {
        const app = getApp({
          override: [
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
      });

      it('should return 500 status code if a db exception happens', async function () {
        repositoryMock.find.mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));

        const response = await requestSender.getAll();

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'failed');
      });
    });
  });

  describe('GET /metadata/{identifier}', function () {
    describe('Happy Path 🙂', function () {
      it('should return 200 status code and the metadata record', async function () {
        const payload = createFakePayload();

        const createResponse = await requestSender.createRecord(payload);
        expect(createResponse.status).toBe(httpStatusCodes.CREATED);
        expect(createResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');

        const id = (createResponse.body as unknown as Metadata).id;
        const response = await requestSender.getRecord(id);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');

        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createResponseWithoutAnyText } = createResponse.body as unknown as Metadata;
        expect(response.body).toMatchObject(createResponseWithoutAnyText);
      });
    });

    describe('Bad Path 😡', function () {
      it('should return 404 if a metadata record with the requested identifier does not exist', async function () {
        const response = await requestSender.getRecord(createUuid());

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        expect(response.body).toHaveProperty('message', `Metadata record with identifier 1 was not found.`);
      });
    });

    describe('Sad Path 😥', function () {
      beforeEach(function () {
        const app = getApp({
          override: [
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
      });

      it('should return 500 status code if a db exception happens', async function () {
        repositoryMock.findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));

        const response = await requestSender.getRecord(createUuid());

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'failed');
      });
    });
  });

  describe('POST /metadata', function () {
    describe('Happy Path 🙂', function () {
      it('if productId not exists, should return 201 status code and the added metadata record when productVersion = 1', async function () {
        const payload = createFakePayload();
        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');

        const body = response.body as unknown as Metadata;
        const getResponse = await requestSender.getRecord(body.id);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createdResponseBody } = body;

        expect(getResponse.body).toMatchObject(createdResponseBody);
        expect(createdResponseBody.productVersion).toBe(1);
      });

      it('if productId exists, should return 201 status code and the added metadata record when productVersion is + 1', async function () {
        const payload = createFakePayload();
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const oldBody = response.body as unknown as Metadata;
        payload.productId = oldBody.productId;
        payload.id = createUuid();
        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });
        const newResponse = await requestSender.createRecord(payload);
        expect(newResponse.status).toBe(httpStatusCodes.CREATED);
        expect(newResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const body = newResponse.body as unknown as Metadata;

        const getResponse = await requestSender.getRecord(body.id);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createdResponseBody } = body;

        expect(getResponse.body).toMatchObject(createdResponseBody);
        expect(createdResponseBody.productId).toBe(oldBody.productId);
        expect(createdResponseBody.productVersion).toBe(Number(oldBody.productVersion) + 1);
      });

      it("if region contains string with a ', should return 201 status code and the added metadata record as expected", async function () {
        const payload = createFakePayload();
        payload.region = ["st'rng"];

        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });
        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');

        const body = response.body as unknown as Metadata;
        const getResponse = await requestSender.getRecord(body.id);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...createdResponseBody } = body;

        expect(getResponse.body).toMatchObject(createdResponseBody);
      });
    });

    describe('Bad Path 😡', function () {
      it('should return 400 status code if id is not exists or null', async function () {
        const payload = createFakePayload();
        payload.id = null as unknown as string;
        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request/body/id must be string`);
      });

      it('should return 400 status code if productId is not exists', async function () {
        const payload = createFakePayload();
        payload.productId = '2';
        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`productId ${payload.productId} doesn't exist`);
      });

      it('should return 400 status code if has property that is not in post scheme', async function () {
        const entity = { avi: 'aviavi' };
        const payload: IPayload = createFakePayload();
        Object.assign(payload, entity);

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request/body must NOT have additional properties`);
      });

      it('should return 400 status code if sourceStartDate is later than sourceEndDate', async function () {
        const payload = createFakePayload();
        const temp = payload.sourceDateStart;
        payload.sourceDateStart = payload.sourceDateEnd;
        payload.sourceDateEnd = temp;

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain('sourceStartDate should not be later than sourceEndDate');
      });

      it('should return 400 status code if minResolutionMeter is bigger than maxResolutionMeter', async function () {
        const payload = createFakePayload();
        const temp = payload.minResolutionMeter;
        payload.minResolutionMeter = payload.maxResolutionMeter;
        payload.maxResolutionMeter = temp;

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain('minResolutionMeter should not be bigger than maxResolutionMeter');
      });

      it('should return 400 status code if region not exists', async function () {
        const payload = createFakePayload();
        payload.region = undefined;

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request/body must have required property 'region'`);
      });

      it('should return 400 status code if region is empty', async function () {
        const payload = createFakePayload();
        payload.region = [];

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request/body/region must NOT have fewer than 1 items`);
      });

      it('should return 400 status code if sensors not exists', async function () {
        const payload = createFakePayload();
        payload.sensors = undefined;

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request/body must have required property 'sensors'`);
      });

      it('should return 400 status code if sensors is empty', async function () {
        const payload = createFakePayload();
        payload.sensors = [];

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.text).toContain(`request/body/sensors must NOT have fewer than 1 items`);
      });

      it('should return 400 status code and error message if classification is not a valid value', async function () {
        const payload: IPayload = createFakePayload();
        const validClassification = randWord();
        mockAxios.get.mockResolvedValue({ data: [{ value: validClassification }] as ILookupOption[] });
        const entity = { classification: '13' };
        Object.assign(payload, entity);
        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toHaveProperty('message', `classification is not a valid value! Optional values: ${validClassification}`);
      });
    });

    describe('Sad Path 😥', function () {
      beforeEach(function () {
        const app = getApp({
          override: [
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
      });

      it('should return 422 status code if a metadata record with the same id already exists', async function () {
        const payload = createFakePayload();
        repositoryMock.find.mockResolvedValue(payload);
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.UNPROCESSABLE_ENTITY);
        expect(response.body).toHaveProperty('message');
      });

      it('should return 500 status code if a db exception happens', async function () {
        const payload = createFakePayload();
        repositoryMock.findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));

        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'failed');
      });

      it('should return 500 status code if a network exception happens in lookup-tables service', async function () {
        const payload: IPayload = createFakePayload();
        mockAxios.get.mockRejectedValueOnce(new Error('lookup-tables is not available'));

        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'Lookup-tables is not available!');
      });
    });
  });

  describe('PATCH /metadata/{identifier}', function () {
    describe('Happy Path 🙂', function () {
      it('should return 200 status code and the updated metadata record', async function () {
        const payload = createFakePayload();
        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });
        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const id = (response.body as unknown as Metadata).id;
        const updatePayload = createFakeUpdatePayload();
        mockAxios.get.mockResolvedValue({ data: [{ value: updatePayload.classification }] as ILookupOption[] });

        const updateResponse = await requestSender.updateRecord(id, updatePayload);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...updatedResponseBody } = updateResponse.body as Metadata;

        expect(updateResponse.status).toBe(httpStatusCodes.OK);
        expect(updateResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(updatedResponseBody.description).toBe(updatePayload.description);
      });

      it('should return 200 status code when there is no sensors', async function () {
        const payload: IPayload = createFakePayload();
        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });
        const response = await requestSender.createRecord(payload);

        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');

        const responseBody = response.body as unknown as Metadata;
        const id = responseBody.id;
        const updatedPayload: IUpdatePayload = createFakeUpdatePayload();
        updatedPayload.classification = payload.classification;
        delete updatedPayload.sensors;

        const updateResponse = await requestSender.updateRecord(id, updatedPayload);
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

        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });

        const response = await requestSender.updateRecord(metadata.id, payload);

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        expect(response.body).toHaveProperty('message', `Metadata record ${metadata.id} does not exist`);
      });

      it('should return 400 status code if has property that is not in update scheme', async function () {
        const payload: IPayload = createFakePayload();
        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const responseBody = response.body as unknown as Metadata;
        const id = responseBody.id;
        const updatedPayload: IUpdatePayload = createFakeUpdatePayload();
        const entity = { avi: 'aviavi' };
        Object.assign(updatedPayload, entity);

        const newResponse = await requestSender.updateRecord(id, updatedPayload);

        expect(newResponse.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(newResponse.text).toContain(`request/body must NOT have additional properties`);
      });

      it('should return 400 status code if sensors is null', async function () {
        const payload: IPayload = createFakePayload();
        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const responseBody = response.body as unknown as Metadata;
        const id = responseBody.id;
        const updatedPayload: IUpdatePayload = createFakeUpdatePayload();
        const entity = { sensors: null };
        Object.assign(updatedPayload, entity);
        const newResponse = await requestSender.updateRecord(id, updatedPayload);

        expect(newResponse.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(newResponse.text).toContain(`request/body/sensors must be array`);
      });

      it('should return 400 status code and error message if classification is not a valid value', async function () {
        const payload: IPayload = createFakePayload();
        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });

        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');

        const responseBody = response.body as unknown as Metadata;
        const id = responseBody.id;
        const updatedPayload = createFakeUpdatePayload();
        const validClassifications = randWord();

        mockAxios.get.mockResolvedValue({ data: [{ value: validClassifications }] as ILookupOption[] });
        const entity = { classification: '13' };
        Object.assign(updatedPayload, entity);

        const newResponse = await requestSender.updateRecord(id, updatedPayload);

        expect(newResponse.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(newResponse.body).toHaveProperty('message', `classification is not a valid value! Optional values: ${validClassifications}`);
      });
    });

    describe('Sad Path 😥', function () {
      beforeEach(function () {
        const app = getApp({
          override: [
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
      });

      it('should return 500 status code if a db exception happens', async function () {
        const metadata = createFakeMetadata();
        const payload = createFakeUpdatePayload();
        repositoryMock.findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));        

        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });
        const response = await requestSender.updateRecord(metadata.id, payload);

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'failed');
      });

      it('should return 500 status code if a network exception happens in lookup-tables service', async function () {
        const payload: IPayload = createFakePayload();
        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });

        const updatedPayload: IUpdatePayload = createFakeUpdatePayload();
        mockAxios.get.mockRejectedValueOnce(new Error('Lookup-tables is not available!'));

        const newResponse = await requestSender.updateRecord(payload.id, updatedPayload);

        expect(newResponse.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(newResponse.body).toHaveProperty('message', 'Lookup-tables is not available!');
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
        const payload = createFakePayload();

        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });

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
      beforeEach(function () {
        const app = getApp({
          override: [
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
      });

      it('should return 500 status code if a db exception happens', async function () {
        repositoryMock.delete.mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));

        const response = await requestSender.deleteRecord(createUuid());

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'failed');
      });
    });
  });

  describe('PATCH /metadata/status/{identifier}', function () {
    describe('Happy Path 🙂', function () {
      it('should return 200 status code and the updated status record', async function () {
        const payload: IPayload = createFakePayload();
        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const id = (response.body as unknown as Metadata).id;
        const updatedPayload: IUpdateStatus = createFakeUpdateStatus();

        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });

        const updateResponse = await requestSender.updateStatusRecord(id, updatedPayload);
        const { anyText, anyTextTsvector, footprint, wkbGeometry, ...updatedResponseBody } = updateResponse.body as Metadata;

        expect(updateResponse.status).toBe(httpStatusCodes.OK);
        expect(updateResponse.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(updatedResponseBody.productStatus).toBe(updatedPayload.productStatus);
      });
    });

    describe('Bad Path 😡', function () {
      it('should return 404 status code if the metadata record does not exist', async function () {
        const metadata = createFakeMetadata();
        const payload = createFakeUpdateStatus();

        const response = await requestSender.updateStatusRecord(metadata.id, payload);

        expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
        expect(response.body).toHaveProperty('message', `Metadata record ${metadata.id} does not exist`);
      });

      it('should return 400 status code if has property that is not in update scheme', async function () {
        const payload: IPayload = createFakePayload();

        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const responseBody = response.body as unknown as Metadata;
        const id = responseBody.id;
        const updatedPayload: IUpdateStatus = createFakeUpdateStatus();

        const entity = { avi: 'aviavi' };
        Object.assign(updatedPayload, entity);

        const newResponse = await requestSender.updateStatusRecord(id, updatedPayload);

        expect(newResponse.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(newResponse.text).toContain(`request/body must NOT have additional properties`);
      });

      it('should return 400 status code if productStatus is null', async function () {
        const payload: IPayload = createFakePayload();

        mockAxios.get.mockResolvedValue({ data: [{ value: payload.classification }] as ILookupOption[] });
        const response = await requestSender.createRecord(payload);
        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        const responseBody = response.body as unknown as Metadata;
        const id = responseBody.id;
        const updatedPayload: IUpdateStatus = createFakeUpdateStatus();
        const entity = { productStatus: null };
        Object.assign(updatedPayload, entity);

        const newResponse = await requestSender.updateStatusRecord(id, updatedPayload);

        expect(newResponse.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(newResponse.text).toContain(`request/body/productStatus must be string`);
      });
    });

    describe('Sad Path 😥', function () {
      beforeEach(function () {
        const app = getApp({
          override: [
            { token: SERVICES.METADATA_REPOSITORY, provider: { useValue: repositoryMock } },
          ],
          useChild: true,
        });
        requestSender = new MetadataRequestSender(app);
      });

      it('should return 500 status code if a db exception happens', async function () {
        const metadata = createFakeMetadata();
        const payload = createFakeUpdateStatus();
        repositoryMock.findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));

        const response = await requestSender.updateStatusRecord(metadata.id, payload);

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'failed');
      });
    });
  });
});

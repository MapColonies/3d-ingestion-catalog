import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { Application } from 'express';
import { QueryFailedError, Repository } from 'typeorm';
import { Metadata } from '../../../../src/metadata/models/metadata';
import { convertTimestampToISOString, createFakeMetadata } from '../../../helpers/helpers';
import { registerTestValues } from '../../testContainerConfig';
import { createDbMetadata, getRepositoryFromContainer } from './helpers/db';
import * as requestSender from './helpers/requestSender';

describe('MetadataController', function () {
  let app: Application;
  let repository: Repository<Metadata>;

  beforeAll(async function () {
    await registerTestValues();
    app = requestSender.getApp();
    repository = getRepositoryFromContainer(Metadata);
    await repository.clear();
  });

  afterAll(function () {
    container.reset();
  });

  describe('GET /metadata', function () {
    describe('Happy Path 🙂', function () {
      it('should return 204 if there are no metadata records', async function () {
        const response = await requestSender.getAll(app);

        expect(response.status).toBe(httpStatusCodes.NO_CONTENT);
      });

      it('should return 200 status code and a metadata records list', async function () {
        const metadata = await createDbMetadata();

        const response = await requestSender.getAll(app);

        expect(response.status).toBe(httpStatusCodes.OK);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(response.body).toHaveLength(1);
        expect(response.body).toMatchObject([convertTimestampToISOString(metadata)]);
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

  describe('POST /metadata', function () {
    describe('Happy Path 🙂', function () {
      it('should return 201 status code and the added metadata record', async function () {
        const metadata = createFakeMetadata();

        const response = await requestSender.createMetadata(app, metadata);

        expect(response.status).toBe(httpStatusCodes.CREATED);
        expect(response.headers).toHaveProperty('content-type', 'application/json; charset=utf-8');
        expect(response.body).toMatchObject(convertTimestampToISOString(metadata));
      });
    });

    describe('Bad Path 😡', function () {
      it('should return 400 status code and error message if mandatory fields are missing', async function () {
        const metadata = createFakeMetadata();
        delete metadata.identifier;
        delete metadata.typeName;
        delete metadata.schema;
        delete metadata.mdSource;
        delete metadata.xml;
        delete metadata.anytext;
        delete metadata.insertDate;

        const response = await requestSender.createMetadata(app, metadata);

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toHaveProperty(
          'message',
          "request.body should have required property 'identifier', request.body should have required property 'typeName', request.body should have required property 'schema', request.body should have required property 'mdSource', request.body should have required property 'xml', request.body should have required property 'anytext', request.body should have required property 'insertDate'"
        );
      });
    });

    describe('Sad Path 😥', function () {
      it('should return 422 status code if a metadata record with the same id already exists', async function () {
        const metadata = createFakeMetadata();
        const findMock = jest.fn().mockResolvedValue(metadata);
        const mockedApp = requestSender.getMockedRepoApp({ findOne: findMock });

        const response = await requestSender.createMetadata(mockedApp, metadata);

        expect(response.status).toBe(httpStatusCodes.UNPROCESSABLE_ENTITY);
        expect(response.body).toHaveProperty('message', `Metadata record ${metadata.identifier} already exists`);
      });

      it('should return 500 status code if a db exception happens', async function () {
        const findMock = jest.fn().mockRejectedValue(new QueryFailedError('select *', [], new Error('failed')));
        const mockedApp = requestSender.getMockedRepoApp({ findOne: findMock });

        const response = await requestSender.createMetadata(mockedApp, createFakeMetadata());

        expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
        expect(response.body).toHaveProperty('message', 'failed');
      });
    });
  });
});
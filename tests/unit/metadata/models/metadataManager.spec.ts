import jsLogger from '@map-colonies/js-logger';
import { QueryFailedError } from 'typeorm';
import httpStatus from 'http-status-codes';
import { trace } from '@opentelemetry/api';
import { MetadataManager } from '../../../../src/metadata/models/metadataManager';
import { createUuid, createMetadata, createPayload, createUpdatePayload, createUpdateStatus } from '../../../helpers/helpers';
import { repositoryMock } from '../../../helpers/mockCreators';
import { AppError } from '../../../../src/common/appError';

let metadataManager: MetadataManager;

describe('MetadataManager', () => {
  beforeEach(() => {
    metadataManager = new MetadataManager(jsLogger({ enabled: false }), trace.getTracer('testTracer'), repositoryMock as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll tests', () => {
    it('returns a metadata list', async () => {
      const metadata = createMetadata();
      repositoryMock.find.mockResolvedValue([metadata]);

      const response = metadataManager.getAll();

      await expect(response).resolves.toStrictEqual([metadata]);
    });

    it('rejects on DB error', async () => {
      repositoryMock.find.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const response = metadataManager.getAll();

      await expect(response).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });

    it('returns undefined if table is empty', async () => {
      repositoryMock.find.mockReturnValue(undefined);

      const response = metadataManager.getAll();

      await expect(response).resolves.toBeUndefined();
    });
  });

  describe('getRecord tests', () => {
    it('returns a metadata record', async () => {
      const metadata = createMetadata();
      repositoryMock.findOne.mockResolvedValue(metadata);

      const response = metadataManager.getRecord(metadata.id);

      await expect(response).resolves.toStrictEqual(metadata);
    });

    it('rejects if record does not exists', async () => {
      const metadata = createMetadata();
      repositoryMock.findOne.mockResolvedValue(undefined);

      const response = metadataManager.getRecord(metadata.id);

      await expect(response).rejects.toThrow(new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${metadata.id} wasn't found on DB`, true));
    });

    it('rejects on DB error', async () => {
      repositoryMock.findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const response = metadataManager.getRecord('1');

      await expect(response).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });
  });

  describe('createRecord tests', () => {
    it('resolves without errors if id is not in use', async () => {
      const payload = createPayload();
      repositoryMock.save.mockResolvedValue(payload);

      const response = await metadataManager.createRecord(payload);

      expect(response).toStrictEqual(payload);
    });

    it('resolves without errors if productId exists', async () => {
      const payload = createPayload();
      payload.productId = payload.productName;
      repositoryMock.save.mockResolvedValue(payload);
      repositoryMock.findOne.mockResolvedValue(payload);

      const response = metadataManager.createRecord(payload);

      await expect(response).resolves.toStrictEqual(payload);
    });

    it('rejects on DB error', async () => {
      const payload = createPayload();
      repositoryMock.save.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const response = metadataManager.createRecord(payload);

      await expect(response).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });
  });

  describe('updateRecord tests', () => {
    it('resolves without errors if id exists', async () => {
      const identifier = createUuid();
      const payload = createUpdatePayload();
      repositoryMock.findOne.mockResolvedValue({ ...payload, footprint: JSON.stringify(payload.footprint) });
      repositoryMock.save.mockResolvedValue(payload);

      const response = metadataManager.updateRecord(identifier, payload);

      await expect(response).resolves.toStrictEqual(payload);
    });

    it('rejects on DB error', async () => {
      const identifier = createUuid();
      const payload = createUpdatePayload();
      repositoryMock.findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const response = metadataManager.updateRecord(identifier, payload);

      await expect(response).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });

    it('rejects if record does not exists', async () => {
      const identifier = createUuid();
      const payload = createUpdatePayload();
      repositoryMock.findOne.mockResolvedValue(undefined);

      const response = metadataManager.updateRecord(identifier, payload);

      await expect(response).rejects.toThrow(new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true));
    });
  });

  describe('deleteRecord tests', () => {
    it('resolves without errors if record exists or not', async () => {
      const metadata = createMetadata();
      repositoryMock.delete.mockResolvedValue(undefined);

      const response = await metadataManager.deleteRecord(metadata.id);

      expect(repositoryMock.delete).toHaveBeenCalled();
      expect(response).toBeUndefined();
    });

    it('rejects on DB error', async () => {
      repositoryMock.delete.mockRejectedValue(new QueryFailedError('select *', [], new Error()));
      const metadata = createMetadata();

      const response = metadataManager.deleteRecord(metadata.id);

      await expect(response).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });
  });

  describe('publishRecord tests', () => {
    it('resolves without errors if id exists', async () => {
      const identifier = createUuid();
      const record = createUpdateStatus();
      repositoryMock.findOne.mockResolvedValue(record);
      repositoryMock.save.mockResolvedValue(record);

      const response = metadataManager.updateStatusRecord(identifier, record);

      await expect(response).resolves.toStrictEqual(record);
    });

    it('rejects on DB error', async () => {
      const identifier = createUuid();
      const record = createUpdateStatus();
      repositoryMock.findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const response = metadataManager.updateStatusRecord(identifier, record);

      await expect(response).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });

    it('rejects if record does not exists', async () => {
      const identifier = createUuid();
      const record = createUpdateStatus();
      repositoryMock.findOne.mockResolvedValue(undefined);

      const response = metadataManager.updateStatusRecord(identifier, record);

      await expect(response).rejects.toThrow(new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true));
    });
  });

  describe('findLastVersion tests', () => {
    it('returns version if productId exists', async () => {
      const metadata = createMetadata();
      repositoryMock.findOne.mockResolvedValue(metadata);

      const response = metadataManager.findLastVersion(metadata.productId);

      await expect(response).resolves.toBe(metadata.productVersion);
    });

    it('returns 0 if productId is not exists', async () => {
      const metadata = createMetadata();
      repositoryMock.findOne.mockResolvedValue(undefined);

      const response = metadataManager.findLastVersion(metadata.productId);

      await expect(response).resolves.toBe(0);
    });

    it('rejects on DB error', async () => {
      const metadata = createMetadata();
      repositoryMock.findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const response = metadataManager.findLastVersion(metadata.productId);

      await expect(response).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });
  });
});

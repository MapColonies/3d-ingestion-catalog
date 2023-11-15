import jsLogger from '@map-colonies/js-logger';
import { QueryFailedError } from 'typeorm';
import httpStatus from 'http-status-codes';
import { MetadataManager } from '../../../../src/metadata/models/metadataManager';
import { createUuid, createFakeMetadata, createFakePayload, createFakeUpdatePayload, createFakeUpdateStatus } from '../../../helpers/helpers';
import { repositoryMock, validationManagerMock } from '../../../helpers/mockCreators';
import { AppError } from '../../../../src/common/appError';

let metadataManager: MetadataManager;

describe('MetadataManager', () => {
  beforeEach(() => {
    metadataManager = new MetadataManager(repositoryMock as never, validationManagerMock as never, jsLogger({ enabled: false }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll tests', () => {
    it('returns a metadata list', async () => {
      const metadata = createFakeMetadata();
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
      const metadata = createFakeMetadata();
      repositoryMock.findOne.mockResolvedValue(metadata);

      const response = metadataManager.getRecord(metadata.id);

      await expect(response).resolves.toStrictEqual(metadata);
    });

    it('rejects if record does not exists', async () => {
      const metadata = createFakeMetadata();
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
      const payload = createFakePayload();
      validationManagerMock.validatePost.mockReturnValue(true);
      repositoryMock.save.mockResolvedValue(payload);

      const response = metadataManager.createRecord(payload);

      await expect(response).resolves.toStrictEqual(payload);
    });

    it('resolves without errors if productId exists', async () => {
      const payload = createFakePayload();
      payload.productId = payload.productName;
      validationManagerMock.validatePost.mockReturnValue(true);
      repositoryMock.save.mockResolvedValue(payload);
      repositoryMock.findOne.mockResolvedValue(payload);

      const response = metadataManager.createRecord(payload);

      await expect(response).resolves.toStrictEqual(payload);
    });

    it('rejects if payload is not valid', async () => {
      const payload = createFakePayload();
      validationManagerMock.validatePost.mockReturnValue('Bad Value');

      const response = metadataManager.createRecord(payload);

      await expect(response).rejects.toThrow(new AppError('BadValues', httpStatus.BAD_REQUEST, 'Bad Value', true));
    });

    it('rejects on DB error', async () => {
      const payload = createFakePayload();
      validationManagerMock.validatePost.mockReturnValue(true);
      repositoryMock.save.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const response = metadataManager.createRecord(payload);

      await expect(response).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });

    it('rejects if record already exists', async () => {
      const payload = createFakePayload();
      validationManagerMock.validatePost.mockRejectedValue(new AppError('', httpStatus.CONFLICT, 'Record Already Exists', true));

      const response = metadataManager.createRecord(payload);

      await expect(response).rejects.toThrow(new AppError('', httpStatus.CONFLICT, 'Record Already Exists', true));
    });
  });

  describe('updateRecord tests', () => {
    it('resolves without errors if id exists', async () => {
      const identifier = createUuid();
      const payload = createFakeUpdatePayload();
      validationManagerMock.validatePatch.mockReturnValue(true);
      repositoryMock.findOne.mockResolvedValue(payload);
      repositoryMock.save.mockResolvedValue(payload);

      const response = metadataManager.updateRecord(identifier, payload);

      await expect(response).resolves.toStrictEqual(payload);
    });

    it('rejects if payload is not valid', async () => {
      const identifier = createUuid();
      const payload = createFakeUpdatePayload();
      validationManagerMock.validatePatch.mockReturnValue('Bad Value');

      const response = metadataManager.updateRecord(identifier, payload);

      await expect(response).rejects.toThrow(new AppError('BadValues', httpStatus.BAD_REQUEST, 'Bad Value', true));
    });

    it('rejects on DB error', async () => {
      const identifier = createUuid();
      const payload = createFakeUpdatePayload();
      repositoryMock.findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const response = metadataManager.updateRecord(identifier, payload);

      await expect(response).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });

    it('rejects if record does not exists', async () => {
      const identifier = createUuid();
      const payload = createFakeUpdatePayload();
      repositoryMock.findOne.mockResolvedValue(undefined);

      const response = metadataManager.updateRecord(identifier, payload);

      await expect(response).rejects.toThrow(new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true));
    });
  });

  describe('deleteRecord tests', () => {
    it('resolves without errors if record exists or not', async () => {
      const metadata = createFakeMetadata();
      repositoryMock.delete.mockResolvedValue(undefined);

      const response = await metadataManager.deleteRecord(metadata.id);

      expect(repositoryMock.delete).toHaveBeenCalled();
      expect(response).toBeUndefined();
    });

    it('rejects on DB error', async () => {
      repositoryMock.delete.mockRejectedValue(new QueryFailedError('select *', [], new Error()));
      const metadata = createFakeMetadata();

      const response = metadataManager.deleteRecord(metadata.id);

      await expect(response).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });
  });

  describe('publishRecord tests', () => {
    it('resolves without errors if id exists', async () => {
      const identifier = createUuid();
      const record = createFakeUpdateStatus();
      repositoryMock.findOne.mockResolvedValue(record);
      repositoryMock.save.mockResolvedValue(record);

      const response = metadataManager.updateStatusRecord(identifier, record);

      await expect(response).resolves.toStrictEqual(record);
    });

    it('rejects on DB error', async () => {
      const identifier = createUuid();
      const record = createFakeUpdateStatus();
      repositoryMock.findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const response = metadataManager.updateStatusRecord(identifier, record);

      await expect(response).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });

    it('rejects if record does not exists', async () => {
      const identifier = createUuid();
      const record = createFakeUpdateStatus();
      repositoryMock.findOne.mockResolvedValue(undefined);

      const response = metadataManager.updateStatusRecord(identifier, record);

      await expect(response).rejects.toThrow(new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true));
    });
  });

  describe('findLastVersion tests', () => {
    it('returns version if productId exists', async () => {
      const metadata = createFakeMetadata();
      repositoryMock.findOne.mockResolvedValue(metadata);

      const response = metadataManager.findLastVersion(metadata.id);

      await expect(response).resolves.toBe(metadata.productVersion);
    });

    it('returns 0 if productId is not exists', async () => {
      const metadata = createFakeMetadata();
      repositoryMock.findOne.mockResolvedValue(undefined);

      const response = metadataManager.findLastVersion(metadata.id);

      await expect(response).resolves.toBe(0);
    });

    it('rejects on DB error', async () => {
      const metadata = createFakeMetadata();
      repositoryMock.findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const response = metadataManager.findLastVersion(metadata.id);

      await expect(response).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });
  });
});

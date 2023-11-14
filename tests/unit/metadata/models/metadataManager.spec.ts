import jsLogger from '@map-colonies/js-logger';
import { QueryFailedError, Repository } from 'typeorm';
import httpStatus from 'http-status-codes';
import { Metadata } from '../../../../src/metadata/models/generated';
import { MetadataManager } from '../../../../src/metadata/models/metadataManager';
import { createUuid, createFakeMetadata, createFakePayload, createFakeUpdatePayload, createFakeUpdateStatus } from '../../../helpers/helpers';
import { validationManagerMock } from '../../../helpers/mockCreators';
import { AppError } from '../../../../src/common/appError';

let metadataManager: MetadataManager;

describe('MetadataManager', () => {
  describe('#getAll', () => {
    const find = jest.fn();
    beforeEach(() => {
      const repository = { find } as unknown as Repository<Metadata>;
      metadataManager = new MetadataManager(repository, validationManagerMock as never, jsLogger({ enabled: false }));
    });
    afterEach(() => {
      find.mockClear();
    });

    it('returns a metadata list', async () => {
      const metadata = createFakeMetadata();
      find.mockResolvedValue([metadata]);

      const getPromise = metadataManager.getAll();

      await expect(getPromise).resolves.toStrictEqual([metadata]);
    });

    it('rejects on DB error', async () => {
      find.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const getPromise = metadataManager.getAll();

      await expect(getPromise).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });

    it('returns undefined if table is empty', async () => {
      find.mockReturnValue(undefined);

      const getPromise = metadataManager.getAll();

      await expect(getPromise).resolves.toBeUndefined();
    });
  });

  describe('#getRecord', () => {
    const findOne = jest.fn();
    beforeEach(() => {
      const repository = { findOne } as unknown as Repository<Metadata>;
      metadataManager = new MetadataManager(repository, validationManagerMock as never, jsLogger({ enabled: false }));
    });
    afterEach(() => {
      findOne.mockClear();
    });

    it('returns a metadata record', async () => {
      const metadata = createFakeMetadata();
      findOne.mockResolvedValue(metadata);

      const getPromise = metadataManager.getRecord(metadata.id);

      await expect(getPromise).resolves.toStrictEqual(metadata);
    });

    it('rejects if record does not exists', async () => {
      const metadata = createFakeMetadata();
      findOne.mockResolvedValue(undefined);

      const getPromise = metadataManager.getRecord(metadata.id);

      await expect(getPromise).rejects.toThrow(new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${metadata.id} wasn't found on DB`, true));
    });

    it('rejects on DB error', async () => {
      findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const getPromise = metadataManager.getRecord('1');

      await expect(getPromise).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });
  });

  describe('#createRecord', () => {
    const save = jest.fn();
    const findOne = jest.fn();
    beforeEach(() => {
      const repository = { save, findOne } as unknown as Repository<Metadata>;
      metadataManager = new MetadataManager(repository, validationManagerMock as never, jsLogger({ enabled: false }));
    });
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('resolves without errors if id is not in use', async () => {
      const payload = createFakePayload();
      validationManagerMock.validatePost.mockReturnValue(true);
      save.mockResolvedValue(payload);

      const createPromise = metadataManager.createRecord(payload);

      await expect(createPromise).resolves.toStrictEqual(payload);
    });

    it('resolves without errors if productId exists', async () => {
      const payload = createFakePayload();
      payload.productId = payload.productName;
      validationManagerMock.validatePost.mockReturnValue(true);
      save.mockResolvedValue(payload);
      findOne.mockResolvedValue(payload);

      const createPromise = metadataManager.createRecord(payload);

      await expect(createPromise).resolves.toStrictEqual(payload);
    });

    it('rejects if payload is not valid', async () => {
      const payload = createFakePayload();
      validationManagerMock.validatePost.mockReturnValue('Bad Value');

      const createPromise = metadataManager.createRecord(payload);

      await expect(createPromise).rejects.toThrow(new AppError('BadValues', httpStatus.BAD_REQUEST, 'Bad Value', true));
    });

    it('rejects on DB error', async () => {
      const payload = createFakePayload();
      validationManagerMock.validatePost.mockReturnValue(true);
      save.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const createPromise = metadataManager.createRecord(payload);

      await expect(createPromise).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });

    it('rejects if record already exists', async () => {
      const payload = createFakePayload();
      validationManagerMock.validatePost.mockRejectedValue(new AppError('', httpStatus.CONFLICT, 'Record Already Exists', true));

      const createPromise = metadataManager.createRecord(payload);

      await expect(createPromise).rejects.toThrow(new AppError('', httpStatus.CONFLICT, 'Record Already Exists', true));
    });
  });

  describe('#updateRecord', () => {
    const findOne = jest.fn();
    const save = jest.fn();
    beforeEach(() => {
      const repository = { findOne, save } as unknown as Repository<Metadata>;
      metadataManager = new MetadataManager(repository, validationManagerMock as never, jsLogger({ enabled: false }));
    });
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('resolves without errors if id exists', async () => {
      const identifier = createUuid();
      const payload = createFakeUpdatePayload();
      validationManagerMock.validatePatch.mockReturnValue(true);
      findOne.mockResolvedValue(payload);
      save.mockResolvedValue(payload);

      const updatePromise = metadataManager.updateRecord(identifier, payload);

      await expect(updatePromise).resolves.toStrictEqual(payload);
    });

    it('rejects if payload is not valid', async () => {
      const identifier = createUuid();
      const payload = createFakeUpdatePayload();
      validationManagerMock.validatePatch.mockReturnValue('Bad Value');

      const createPromise = metadataManager.updateRecord(identifier, payload);

      await expect(createPromise).rejects.toThrow(new AppError('BadValues', httpStatus.BAD_REQUEST, 'Bad Value', true));
    });

    it('rejects on DB error', async () => {
      const identifier = createUuid();
      const payload = createFakeUpdatePayload();
      findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const updatePromise = metadataManager.updateRecord(identifier, payload);

      await expect(updatePromise).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });

    it('rejects if record does not exists', async () => {
      const identifier = createUuid();
      const payload = createFakeUpdatePayload();
      findOne.mockResolvedValue(undefined);

      const updatePromise = metadataManager.updateRecord(identifier, payload);

      await expect(updatePromise).rejects.toThrow(
        new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true)
      );
    });
  });

  describe('#deleteRecord', () => {
    const del = jest.fn();
    beforeEach(() => {
      const repository = { delete: del } as unknown as Repository<Metadata>;
      metadataManager = new MetadataManager(repository, validationManagerMock as never, jsLogger({ enabled: false }));
    });
    afterEach(() => {
      del.mockClear();
    });

    it('resolves without errors if record exists or not', async () => {
      const metadata = createFakeMetadata();

      await metadataManager.deleteRecord(metadata.id);

      expect(del).toHaveBeenCalled();
    });

    it('rejects on DB error', async () => {
      del.mockRejectedValue(new QueryFailedError('select *', [], new Error()));
      const metadata = createFakeMetadata();

      const deletePromise = metadataManager.deleteRecord(metadata.id);

      await expect(deletePromise).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });
  });

  describe('#publishRecord', () => {
    const findOne = jest.fn();
    const save = jest.fn();
    beforeEach(() => {
      const repository = { findOne, save } as unknown as Repository<Metadata>;
      metadataManager = new MetadataManager(repository, validationManagerMock as never, jsLogger({ enabled: false }));
    });
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('resolves without errors if id exists', async () => {
      const identifier = createUuid();
      const record = createFakeUpdateStatus();
      findOne.mockResolvedValue(record);
      save.mockResolvedValue(record);

      const updatePromise = metadataManager.updateStatusRecord(identifier, record);

      await expect(updatePromise).resolves.toStrictEqual(record);
    });

    it('rejects on DB error', async () => {
      const identifier = createUuid();
      const record = createFakeUpdateStatus();
      findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const updatePromise = metadataManager.updateStatusRecord(identifier, record);

      await expect(updatePromise).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });

    it('rejects if record does not exists', async () => {
      const identifier = createUuid();
      const record = createFakeUpdateStatus();
      findOne.mockResolvedValue(undefined);

      const updatePromise = metadataManager.updateStatusRecord(identifier, record);

      await expect(updatePromise).rejects.toThrow(
        new AppError('NOT_FOUND', httpStatus.NOT_FOUND, `Identifier ${identifier} wasn't found on DB`, true)
      );
    });
  });

  describe('#findLastVersion', () => {
    const findOne = jest.fn();
    beforeEach(() => {
      const repository = { findOne } as unknown as Repository<Metadata>;
      metadataManager = new MetadataManager(repository, validationManagerMock as never, jsLogger({ enabled: false }));
    });
    afterEach(() => {
      findOne.mockClear();
    });

    it('returns version if productId exists', async () => {
      const metadata = createFakeMetadata();
      findOne.mockResolvedValue(metadata);

      const findPromise = metadataManager.findLastVersion(metadata.id);

      await expect(findPromise).resolves.toBe(metadata.productVersion);
    });

    it('returns 0 if productId is not exists', async () => {
      const metadata = createFakeMetadata();
      findOne.mockResolvedValue(undefined);

      const findPromise = metadataManager.findLastVersion(metadata.id);

      await expect(findPromise).resolves.toBe(0);
    });

    it('rejects on DB error', async () => {
      const metadata = createFakeMetadata();
      findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const updatePromise = metadataManager.findLastVersion(metadata.id);

      await expect(updatePromise).rejects.toThrow(new AppError('Internal', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB', true));
    });
  });
});

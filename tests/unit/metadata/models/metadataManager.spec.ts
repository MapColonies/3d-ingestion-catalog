import { QueryFailedError, Repository } from 'typeorm';
import { EntityNotFoundError, IdAlreadyExistsError } from '../../../../src/metadata/models/errors';
import { Metadata } from '../../../../src/metadata/models/metadata';
import { MetadataManager } from '../../../../src/metadata/models/metadataManager';
import { createFakeMetadata } from '../../../helpers/helpers';

let metadataManager: MetadataManager;

describe('MetadataManager', () => {
  describe('#getAll', () => {
    const find = jest.fn();
    beforeEach(() => {
      const repository = ({ find } as unknown) as Repository<Metadata>;
      metadataManager = new MetadataManager(repository, { log: jest.fn() });
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

      await expect(getPromise).rejects.toThrow(QueryFailedError);
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
      const repository = ({ findOne } as unknown) as Repository<Metadata>;
      metadataManager = new MetadataManager(repository, { log: jest.fn() });
    });
    afterEach(() => {
      findOne.mockClear();
    });

    it('returns a metadata record', async () => {
      const metadata = createFakeMetadata();
      findOne.mockResolvedValue(metadata);

      const getPromise = metadataManager.getRecord(metadata.identifier);

      await expect(getPromise).resolves.toStrictEqual(metadata);
    });

    it('rejects on DB error', async () => {
      findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));

      const getPromise = metadataManager.getRecord('1');

      await expect(getPromise).rejects.toThrow(QueryFailedError);
    });

    it('returns undefined if table is empty', async () => {
      findOne.mockReturnValue(undefined);

      const getPromise = metadataManager.getRecord('1');

      await expect(getPromise).resolves.toBeUndefined();
    });
  });

  describe('#createRecord', () => {
    const insert = jest.fn();
    const findOne = jest.fn();
    beforeEach(() => {
      const repository = ({ insert, findOne } as unknown) as Repository<Metadata>;
      metadataManager = new MetadataManager(repository, { log: jest.fn() });
    });
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('resolves without errors if id is not in use', async () => {
      findOne.mockResolvedValue(undefined);
      insert.mockResolvedValue(undefined);
      const metadata = createFakeMetadata();

      const createPromise = metadataManager.createRecord(metadata);

      await expect(createPromise).resolves.toStrictEqual(metadata);
    });

    it('rejects on DB error', async () => {
      findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));
      const metadata = createFakeMetadata();

      const createPromise = metadataManager.createRecord(metadata);

      await expect(createPromise).rejects.toThrow(QueryFailedError);
    });

    it('rejects if record already exists', async () => {
      const metadata = createFakeMetadata();
      findOne.mockResolvedValue(metadata);
      insert.mockResolvedValue(undefined);

      const createPromise = metadataManager.createRecord(metadata);

      await expect(createPromise).rejects.toThrow(IdAlreadyExistsError);
    });
  });

  describe('#updateRecord', () => {
    const findOne = jest.fn();
    const save = jest.fn();
    beforeEach(() => {
      const repository = ({ findOne, save } as unknown) as Repository<Metadata>;
      metadataManager = new MetadataManager(repository, { log: jest.fn() });
    });
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('resolves without errors if id is not in use', async () => {
      const metadata = createFakeMetadata();
      findOne.mockResolvedValue(metadata);
      save.mockResolvedValue(metadata);

      const updatePromise = metadataManager.updateRecord(metadata.identifier, metadata);

      await expect(updatePromise).resolves.toStrictEqual(metadata);
    });

    it('rejects on DB error', async () => {
      findOne.mockRejectedValue(new QueryFailedError('select *', [], new Error()));
      const metadata = createFakeMetadata();

      const updatePromise = metadataManager.updateRecord(metadata.identifier, metadata);

      await expect(updatePromise).rejects.toThrow(QueryFailedError);
    });

    it('rejects if record does not exists', async () => {
      const metadata = createFakeMetadata();
      findOne.mockResolvedValue(undefined);

      const updatePromise = metadataManager.updateRecord(metadata.identifier, metadata);

      await expect(updatePromise).rejects.toThrow(EntityNotFoundError);
    });
  });

  /*describe('#deleteRecord', () => {
    const del = jest.fn();
    beforeEach(() => {
      const repository = ({ del } as unknown) as Repository<Metadata>;
      metadataManager = new MetadataManager(repository, { log: jest.fn() });
    });
    afterEach(() => {
      del.mockClear();
    });

    it('resolves without errors if record exists or not', async () => {
      const metadata = createFakeMetadata();
      del.mockResolvedValue(metadata);

      const deletePromise = metadataManager.deleteRecord(metadata.identifier);

      await expect(deletePromise).resolves.toStrictEqual(metadata);
    });

    it('rejects on DB error', async () => {
      del.mockRejectedValue(new QueryFailedError('select *', [], new Error()));
      const metadata = createFakeMetadata();

      const deletePromise = metadataManager.deleteRecord(metadata.identifier);

      await expect(deletePromise).rejects.toThrow(QueryFailedError);
    });
  });*/
});

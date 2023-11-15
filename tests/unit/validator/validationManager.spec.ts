import jsLogger from '@map-colonies/js-logger';
import httpStatus from 'http-status-codes';
import { randUuid, randWord } from '@ngneat/falso';
import { ValidationManager } from '../../../src/validator/validationManager';
import { AppError } from '../../../src/common/appError';
import { lookupTablesMock, repositoryMock } from '../../helpers/mockCreators';
import { createFakePayload, createFakeUpdatePayload } from '../../helpers/helpers';

describe('ValidationManager', () => {
  let validationManager: ValidationManager;

  beforeEach(() => {
    validationManager = new ValidationManager(jsLogger({ enabled: false }), lookupTablesMock as never, repositoryMock as never);
  });
  // afterEach(() => {
  //   jest.clearAllMocks();
  // });

  describe('validateDates tests', () => {
    it('returns true when start date is earlier than end date', () => {
      const startDate = new Date(2021, 11, 12, 7);
      const endDate = new Date(2022, 11, 12, 8);

      const result = validationManager['validateDates'](startDate, endDate);

      expect(result).toBe(true);
    });

    it('returns false when end date is earlier than start date', () => {
      const startDate = new Date(2022, 11, 12, 8);
      const endDate = new Date(2022, 11, 12, 7);

      const result = validationManager['validateDates'](startDate, endDate);

      expect(result).toBe('sourceStartDate should not be later than sourceEndDate');
    });
  });

  describe('validateResolutionMeter tests', () => {
    it('returns true when one of them is undefined', () => {
      const minResolutionMeter = 1;
      const maxResolutionMeter = undefined;

      const result = validationManager['validateResolutionMeter'](minResolutionMeter, maxResolutionMeter);

      expect(result).toBe(true);
    });

    it('returns true when minResolutionMeter is smaller than maxResolutionMeter', () => {
      const minResolutionMeter = 1;
      const maxResolutionMeter = 2;

      const result = validationManager['validateResolutionMeter'](minResolutionMeter, maxResolutionMeter);

      expect(result).toBe(true);
    });

    it('returns false when minResolutionMeter is bigger than maxResolutionMeter', () => {
      const minResolutionMeter = 2;
      const maxResolutionMeter = 1;

      const result = validationManager['validateResolutionMeter'](minResolutionMeter, maxResolutionMeter);

      expect(result).toBe('minResolutionMeter should not be bigger than maxResolutionMeter');
    });
  });

  describe('validateClassification tests', () => {
    it('returns true when classification exists in lookup-tables', async () => {
      const classification = randWord();
      lookupTablesMock.getClassifications.mockResolvedValue([classification]);

      const result = await validationManager['validateClassification'](classification);

      expect(result).toBe(true);
    });

    it('returns false when classification does not exist in lookup-tables', async () => {
      const classification = randWord();
      const optionalClassifications = [randWord(), randWord()];
      lookupTablesMock.getClassifications.mockResolvedValue(optionalClassifications);

      const result = await validationManager['validateClassification'](classification);

      expect(result).toBe(`Classification is not a valid value! Optional values: ${optionalClassifications.join()}`);
    });

    it('throws error when there is an error in lookup-tables', async () => {
      const classification = randWord();
      lookupTablesMock.getClassifications.mockRejectedValue(new Error('Problem with LookupTables service'));

      const result = async () => {
        await validationManager['validateClassification'](classification);
      };

      await expect(result).rejects.toThrow(Error('Problem with LookupTables service'));
    });
  });

  describe('validateUniqID tests', () => {
    it('returns true when id is uniq', async () => {
      const identifier = randUuid();
      repositoryMock.findOne.mockResolvedValue(undefined);

      const result = await validationManager['validateUniqID'](identifier);

      expect(result).toBe(true);
    });

    it('throws error when id is not uniq', async () => {
      const id = randUuid();
      repositoryMock.findOne.mockResolvedValue(id);

      const result = async () => validationManager['validateUniqID'](id);

      await expect(result).rejects.toThrow(new AppError('DuplicatedID', httpStatus.CONFLICT, `Record with identifier: ${id} already exists!`, true));
    });

    it('throws error when there is an error with DB', async () => {
      const id = randUuid();
      repositoryMock.findOne.mockRejectedValue(new Error());

      const result = async () => validationManager['validateUniqID'](id);

      await expect(result).rejects.toThrow(
        new AppError('Catalog', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB during validation of ID', true)
      );
    });
  });

  describe('validateProductID tests', () => {
    it('returns true when productId is null', async () => {
      const productId = undefined;

      const result = await validationManager['validateProductID'](productId);

      expect(result).toBe(true);
    });

    it('returns true when productId is not null and exists in DB', async () => {
      const productId = randUuid();
      repositoryMock.findOne.mockResolvedValue(productId);

      const result = await validationManager['validateProductID'](productId);

      expect(result).toBe(true);
    });

    it('returns error string when productId is not null but not exists in DB', async () => {
      const productId = randUuid();
      repositoryMock.findOne.mockResolvedValue(undefined);

      const result = await validationManager['validateProductID'](productId);

      expect(result).toBe(`productId: '${productId}' doesn't exist in the DB`);
    });

    it('throws error when there is an error with DB', async () => {
      const productId = randUuid();
      repositoryMock.findOne.mockRejectedValue(new Error());

      const result = async () => validationManager['validateProductID'](productId);

      await expect(result).rejects.toThrow(
        new AppError('Catalog', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB during validation of productID', true)
      );
    });
  });

  describe('validateRecordExistence tests', () => {
    it('returns true when there is a record with provided id', async () => {
      const identifier = randUuid();
      repositoryMock.findOne.mockResolvedValue(identifier);

      const result = await validationManager['validateRecordExistence'](identifier);

      expect(result).toBe(true);
    });

    it('returns error string when there is no record with provided id', async () => {
      const id = randUuid();
      repositoryMock.findOne.mockResolvedValue(undefined);

      const result = await validationManager['validateRecordExistence'](id);

      expect(result).toBe(`Record with identifier: ${id} doesn't exist!`);
    });

    it('throws error when there is an error with DB', async () => {
      const id = randUuid();
      repositoryMock.findOne.mockRejectedValue(new Error());

      const result = async () => validationManager['validateRecordExistence'](id);

      await expect(result).rejects.toThrow(
        new AppError('Catalog', httpStatus.INTERNAL_SERVER_ERROR, 'Problem with the DB during validation of record existence', true)
      );
    });
  });

  describe('validatePost tests', () => {
    it('returns true when got all functions valid', async () => {
      const payload = createFakePayload();
      repositoryMock.findOne.mockResolvedValueOnce(undefined); // For validateUniqID
      lookupTablesMock.getClassifications.mockResolvedValue([payload.classification]);

      const result = await validationManager.validatePost(payload);

      expect(result).toBe(true);
    });

    it('returns error string when has one invalid function', async () => {
      const payload = createFakePayload();
      repositoryMock.findOne.mockResolvedValueOnce(undefined); // For validateUniqID
      lookupTablesMock.getClassifications.mockResolvedValue([randWord()]);

      const result = await validationManager.validatePost(payload);

      expect(typeof result).toBe('string');
    });
  });

  describe('validatePatch tests', () => {
    it('returns true when got all functions valid', async () => {
      const id = randUuid();
      const payload = createFakeUpdatePayload();
      repositoryMock.findOne.mockResolvedValueOnce(id); // For validateRecordExistence
      lookupTablesMock.getClassifications.mockResolvedValue([payload.classification]);

      const result = await validationManager.validatePatch(id, payload);

      expect(result).toBe(true);
    });

    it('returns true when does not have classification', async () => {
      const id = randUuid();
      const payload = createFakeUpdatePayload();
      delete payload.classification;
      repositoryMock.findOne.mockResolvedValueOnce(id); // For validateRecordExistence

      const result = await validationManager.validatePatch(id, payload);

      expect(result).toBe(true);
    });

    it('returns error string when has one invalid function', async () => {
      const id = randUuid();
      const payload = createFakeUpdatePayload();
      lookupTablesMock.getClassifications.mockResolvedValue([randWord()]);

      const result = await validationManager.validatePatch(id, payload);

      expect(typeof result).toBe('string');
    });
  });
});

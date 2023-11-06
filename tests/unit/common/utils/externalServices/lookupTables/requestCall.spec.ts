import mockAxios from 'jest-mock-axios';
import config from 'config';
import jsLogger from '@map-colonies/js-logger';
import { LookupTablesCall } from '../../../../../../src/externalServices/lookUpTables/requestCall';
import { ILookupOption } from '../../../../../../src/common/interfaces';
import { createLookupOptions } from '../../../../../helpers/helpers';


describe('lookupTablesCall', () => {
  let lookupTables: LookupTablesCall;

  beforeEach(() => {
    lookupTables = new LookupTablesCall(config, jsLogger({ enabled: false }));
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getClassifications Function', () => {
    it('Get the classification without errors', async () => {
      const url = config.get<string>('lookupTables.url');
      const lookupOptions: ILookupOption[] = createLookupOptions(2);
      const expected = [lookupOptions[0].value, lookupOptions[1].value];
      mockAxios.get.mockResolvedValue({ data: lookupOptions });

      const result = await lookupTables.getClassifications();

      console.log(`${url}/lookup-tables/lookupData/classification`)
      expect(mockAxios.get).toHaveBeenCalledWith(`http://127.0.0.1:8080/lookup-tables/lookupData/classification`);
      expect(result).toMatchObject(expected);
    });


    it('rejects if service is not available', async () => {
      mockAxios.get.mockRejectedValue(new Error('lookup-tables is not available'));
    
      try {
        await lookupTables.getClassifications();
      } catch (error) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(error).toBe('lookup-tables is not available');
      }
    });
  });
});


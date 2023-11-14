import { Link } from '@map-colonies/mc-model-types';
import { deserializeLinks, formatStrings, linksToString } from '../../../src/common/utils/format';

describe('format tests', () => {
  describe('deserializeLinks tests', () => {
    it("Should return empty list when receiving an empty string or 'undefined' as parameter", () => {
      const linksStr = undefined;
      expect(deserializeLinks(linksStr)).toStrictEqual([]);
    });
    it('Should return correct serialized links string when given single Link', () => {
      const linksStr = 'testName,testDescription,testProtocol,http://testURL.com';
      const expectedResult: Link[] = [{ name: 'testName', description: 'testDescription', protocol: 'testProtocol', url: 'http://testURL.com' }];
      expect(deserializeLinks(linksStr)).toStrictEqual(expectedResult);
    });
    it('Should return correct serialized links string when given multiple Links', () => {
      const linksStr = 'testName1,testDescription1,testProtocol1,http://testURL1.com^testName2,testDescription2,testProtocol2,http://testURL2.com';
      const expectedResult: Link[] = [
        { name: 'testName1', description: 'testDescription1', protocol: 'testProtocol1', url: 'http://testURL1.com' },
        { name: 'testName2', description: 'testDescription2', protocol: 'testProtocol2', url: 'http://testURL2.com' },
      ];
      expect(deserializeLinks(linksStr)).toStrictEqual(expectedResult);
    });
  });

  describe('linksToString tests', () => {
    it('Should return empty link when receiving an empty array', () => {
      const linksStr: Link[] = [];
      expect(linksToString(linksStr)).toBe('');
    });

    it('Should return link as a string when receiving a single link', () => {
      const linksStr: Link[] = [{ name: 'testName', description: 'testDescription', protocol: 'testProtocol', url: 'http://testURL.com' }];
      const expectedResult = 'testName,testDescription,testProtocol,http://testURL.com';
      expect(linksToString(linksStr)).toStrictEqual(expectedResult);
    });

    it(`Should return links separated by '^' when given multiple Links`, () => {
      const linksStr: Link[] = [
        { name: 'testName1', description: 'testDescription1', protocol: 'testProtocol1', url: 'http://testURL1.com' },
        { name: 'testName2', description: 'testDescription2', protocol: 'testProtocol2', url: 'http://testURL2.com' },
      ];
      const expectedResult =
        'testName1,testDescription1,testProtocol1,http://testURL1.com^testName2,testDescription2,testProtocol2,http://testURL2.com';
      expect(linksToString(linksStr)).toStrictEqual(expectedResult);
    });
  });

  describe('formatStrings tests', () => {
    it("Should return object with all values without any changes if the object doesn't contain the char: '", () => {
      const payload: Record<string, string> = { name: 'name' };
      expect(formatStrings(payload)).toStrictEqual(payload);
    });

    it("If one key has value with the char: ', the char will be replaced by the char: `", () => {
      const payload: Record<string, string> = { name: `na'me` };
      const expectedResult: Record<string, string> = { name: 'na`me' };
      expect(formatStrings(payload)).toStrictEqual(expectedResult);
    });

    it("If multiple keys has values with the char: ', the char in all values will be replaced by the char: `", () => {
      const payload: Record<string, string> = { name: `na'me`, name2: `name'2` };
      const expectedResult: Record<string, string> = { name: 'na`me', name2: 'name`2' };
      expect(formatStrings(payload)).toStrictEqual(expectedResult);
    });
  });
});

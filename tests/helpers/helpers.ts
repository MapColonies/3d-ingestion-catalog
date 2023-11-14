import RandExp from 'randexp';
import { RecordType, ProductType, RecordStatus } from '@map-colonies/mc-model-types';
import { randBetweenDate, randNumber, randPastDate, randSentence, randUuid, randWord } from '@ngneat/falso';
import { Metadata } from '../../src/metadata/models/generated';
import { IUpdateMetadata, IUpdatePayload, IUpdateStatus } from '../../src/common/interfaces';
import { IPayload } from '../../src/common/types';
import { linksToString } from '../../src/common/utils/format';
import {ILookupOption} from '../../src/externalServices/lookUpTables/interfaces'

const productBoundingBoxHelper = new RandExp('^([-+]?(0|[1-9]\\d*)(\\.\\d+)?,){3}[-+]?(0|[1-9]\\d*)(\\.\\d+)?$').gen();

const minX = randNumber({ min: -180, max: 179 });
const minY = randNumber({ min: -180, max: 179 });
const maxX = randNumber({ min: minX, max: 180 });
const maxY = randNumber({ min: minY, max: 180 });
const FOOTPRINT = {
  coordinates: [
    [
      [minX, minY],
      [minX, maxY],
      [maxX, maxY],
      [maxX, minY],
      [minX, minY],
    ],
  ],
  type: 'Polygon',
};
const WKT_GEOMETRY = `POLYGON ((${minX} ${minY}, ${minX} ${maxY}, ${maxX} ${maxY}, ${maxX} ${minY}, ${minX} ${minY}))`;
const maxResolutionMeter = 8000;
const noDataAccuracy = 999;
const maxSE90 = 250;
const maxAccuracy = 100;
const linksPattern = [
  {
    protocol: 'test',
    url: 'http://test.test/wmts',
  },
  {
    name: 'testLink',
    description: 'test test test',
    protocol: 'fulltest',
    url: 'http://test.test/wms',
  },
];

function createFakeIUpdate(): Partial<IUpdatePayload> {
  const minResolutionMeter = randNumber({ max: maxResolutionMeter});
  const payload: IUpdatePayload = {
    productName: randWord(),
    description: randWord(),
    creationDate: randPastDate(),
    classification: randWord(),
    minResolutionMeter: minResolutionMeter,
    maxResolutionMeter: randNumber({ min: minResolutionMeter, max: maxResolutionMeter }),
    maxAccuracyCE90: randNumber({ max: noDataAccuracy }),
    absoluteAccuracyLE90: randNumber({ max: noDataAccuracy }),
    accuracySE90: randNumber({ max: maxSE90 }),
    relativeAccuracySE90: randNumber({ max: maxAccuracy }),
    visualAccuracy: randNumber({ max: maxAccuracy }),
    heightRangeFrom: randNumber(),
    heightRangeTo: randNumber(),
    producerName: randWord(),
    minFlightAlt: randNumber(),
    maxFlightAlt: randNumber(),
    geographicArea: randWord(),
  };
  return payload;
}

export const createFakePayload = (): IPayload => {
  const sourceDateStart = randPastDate();
  const sourceDateEnd = randBetweenDate({ from: sourceDateStart, to: new Date() });
  const minResolutionMeter = randNumber({ max: maxResolutionMeter });
  const record: IPayload = {
    id: randUuid(),
    productId: undefined,
    type: RecordType.RECORD_3D,
    productName: randWord(),
    productType: ProductType.PHOTO_REALISTIC_3D,
    description: randSentence(),
    creationDate: randPastDate(),
    sourceDateStart: sourceDateStart,
    sourceDateEnd: sourceDateEnd,
    minResolutionMeter: minResolutionMeter,
    maxResolutionMeter: randNumber({ min: minResolutionMeter, max: maxResolutionMeter }),
    maxAccuracyCE90: randNumber({max:noDataAccuracy}),
    absoluteAccuracyLE90: randNumber({max:noDataAccuracy}),
    accuracySE90: randNumber({max:maxSE90}),
    relativeAccuracySE90: randNumber({max:maxAccuracy}),
    visualAccuracy: randNumber({max:maxAccuracy}),
    sensors: [randWord()],
    footprint: FOOTPRINT as GeoJSON.Geometry,
    heightRangeFrom: randNumber(),
    heightRangeTo: randNumber(),
    srsId: randWord(),
    srsName: randWord(),
    region: [randWord()],
    classification: randWord(),
    productionSystem: randWord(),
    productionSystemVer: randWord(),
    producerName: randWord(),
    minFlightAlt: randNumber(),
    maxFlightAlt: randNumber(),
    geographicArea: randWord(),
    productSource: randWord(),
    productStatus: RecordStatus.UNPUBLISHED,
    links: linksPattern,
  };
  return record;
};

export const createFakeMetadata = (): Metadata => {
  const sourceDateStart = randPastDate();
  const sourceDateEnd = randBetweenDate({ from: sourceDateStart, to: new Date() });
  const minResolutionMeter = randNumber({ max: maxResolutionMeter });
  const id = randWord();
  const metadata: Metadata = {
    type: RecordType.RECORD_3D,
    productName: randWord(),
    productType: ProductType.PHOTO_REALISTIC_3D,
    description: randSentence(),
    creationDate: randPastDate(),
    sourceDateStart: sourceDateStart,
    sourceDateEnd: sourceDateEnd,
    minResolutionMeter: minResolutionMeter,
    maxResolutionMeter: randNumber({ min: minResolutionMeter, max: maxResolutionMeter }),
    maxAccuracyCE90: randNumber({max:noDataAccuracy}),
    absoluteAccuracyLE90: randNumber({max:noDataAccuracy}),
    accuracySE90: randNumber({max:maxSE90}),
    relativeAccuracySE90: randNumber({max:maxAccuracy}),
    visualAccuracy: randNumber({max:maxAccuracy}),
    footprint: FOOTPRINT as GeoJSON.Geometry,
    heightRangeFrom: randNumber(),
    heightRangeTo: randNumber(),
    srsId: randWord(),
    srsName: randWord(),
    classification: randWord(),
    productionSystem: randWord(),
    productionSystemVer: randWord(),
    producerName: randWord(),
    minFlightAlt: randNumber(),
    maxFlightAlt: randNumber(),
    geographicArea: randWord(),
    productSource: randWord(),
    wktGeometry: WKT_GEOMETRY,
    productStatus: RecordStatus.UNPUBLISHED,
    id: id,
    productVersion: 1,
    productId: id,
    typeName: 'mc_MC3DRecord',
    mdSource: '',
    productBoundingBox: productBoundingBoxHelper,
    schema: 'md_3d',
    xml: '',
    anyText: 'testAnyText',
    keywords: 'testKeywords',
    sensors: [randWord()].join(', '),
    region: [randWord()].join(', '),
    links: linksToString(linksPattern),
  };
  return metadata;
};

export const createFakeUpdatePayload = (): IUpdatePayload => {
  const payload: IUpdatePayload = {
    ...createFakeIUpdate(),
    sensors: [randWord()],
  };
  return payload;
};

export const createFakeUpdateMetadata = (): IUpdateMetadata => {
  const metadata: IUpdateMetadata = {
    ...createFakeIUpdate(),
    sensors: randWord(),
  };
  return metadata;
};

export const createFakeUpdateStatus = (): IUpdateStatus => {
  const metadata: IUpdateStatus = {
    productStatus: RecordStatus.PUBLISHED,
  };
  return metadata;
};

export const createUuid = (): string => {
  return randUuid();
};

export const createLookupOptions = (amount = randNumber({ min: 1, max: 3 })): ILookupOption[] => {
  const lookupOptions: ILookupOption[] = [];
  for (let i = 0; i < amount; i++) {
    lookupOptions.push(createLookupOption());
  }
  return lookupOptions;
};

export const createLookupOption = (): ILookupOption => {
  return {
    value: randWord(),
    translationCode: randWord(),
  };
};

import RandExp from 'randexp';
import { RecordType, ProductType, RecordStatus } from '@map-colonies/mc-model-types';
import { faker } from '@faker-js/faker';
import { Polygon, randomPolygon } from '@turf/turf';
import { Metadata } from '../../src/DAL/entities/metadata';
import { IUpdatePayload, IUpdateStatus } from '../../src/common/interfaces';
import { IPayload } from '../../src/common/types';
import { linksToString } from '../../src/common/utils/format';

const productBoundingBoxHelper = new RandExp('^([-+]?(0|[1-9]\\d*)(\\.\\d+)?,){3}[-+]?(0|[1-9]\\d*)(\\.\\d+)?$').gen();

const minX = faker.number.int({ min: -180, max: 179 });
const minY = faker.number.int({ min: -180, max: 179 });
const maxX = faker.number.int({ min: minX, max: 180 });
const maxY = faker.number.int({ min: minY, max: 180 });
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
} as Polygon;

function createFootprint(): Polygon {
  return randomPolygon().features[0].geometry;
}

function createIUpdate(): Partial<IUpdatePayload> {
  const minResolutionMeter = faker.number.int({ max: maxResolutionMeter });
  const payload: IUpdatePayload = {
    productName: faker.word.sample(),
    description: faker.word.sample(),
    creationDate: faker.date.past(),
    classification: faker.word.sample(),
    minResolutionMeter: minResolutionMeter,
    sourceDateStart: faker.date.past(),
    sourceDateEnd: faker.date.soon(),
    footprint: createFootprint(),
    maxResolutionMeter: faker.number.int({ min: minResolutionMeter, max: maxResolutionMeter }),
    maxAccuracyCE90: faker.number.int({ max: noDataAccuracy }),
    absoluteAccuracyLE90: faker.number.int({ max: noDataAccuracy }),
    accuracySE90: faker.number.int({ max: maxSE90 }),
    relativeAccuracySE90: faker.number.int({ max: maxAccuracy }),
    visualAccuracy: faker.number.int({ max: maxAccuracy }),
    heightRangeFrom: faker.number.int({ max: noDataAccuracy }),
    heightRangeTo: faker.number.int({ max: noDataAccuracy }),
    producerName: faker.word.sample(),
    minFlightAlt: faker.number.int({ max: noDataAccuracy }),
    maxFlightAlt: faker.number.int({ max: noDataAccuracy }),
    geographicArea: faker.word.sample(),
  };
  return payload;
}

export const createPayload = (): IPayload => {
  const sourceDateStart = faker.date.past();
  const sourceDateEnd = faker.date.between({ from: sourceDateStart, to: new Date() });
  const minResolutionMeter = faker.number.int({ max: maxResolutionMeter });
  const record: IPayload = {
    id: faker.string.uuid(),
    productId: undefined,
    type: RecordType.RECORD_3D,
    productName: faker.word.sample(),
    productType: ProductType.PHOTO_REALISTIC_3D,
    description: faker.word.words(),
    creationDate: faker.date.past(),
    sourceDateStart: sourceDateStart,
    sourceDateEnd: sourceDateEnd,
    minResolutionMeter: minResolutionMeter,
    maxResolutionMeter: faker.number.int({ min: minResolutionMeter, max: maxResolutionMeter }),
    maxAccuracyCE90: faker.number.int({ max: noDataAccuracy }),
    absoluteAccuracyLE90: faker.number.int({ max: noDataAccuracy }),
    accuracySE90: faker.number.int({ max: maxSE90 }),
    relativeAccuracySE90: faker.number.int({ max: maxAccuracy }),
    visualAccuracy: faker.number.int({ max: maxAccuracy }),
    sensors: [faker.word.sample()],
    footprint: FOOTPRINT,
    heightRangeFrom: faker.number.int({ max: noDataAccuracy }),
    heightRangeTo: faker.number.int({ max: noDataAccuracy }),
    srsId: faker.word.sample(),
    srsName: faker.word.sample(),
    region: [faker.word.sample()],
    classification: faker.word.sample(),
    productionSystem: faker.word.sample(),
    productionSystemVer: faker.word.sample(),
    producerName: faker.word.sample(),
    minFlightAlt: faker.number.int({ max: noDataAccuracy }),
    maxFlightAlt: faker.number.int({ max: noDataAccuracy }),
    geographicArea: faker.word.sample(),
    productSource: faker.word.sample(),
    productStatus: RecordStatus.UNPUBLISHED,
    links: linksPattern,
  };
  return record;
};

export const createMetadata = (): Metadata => {
  const sourceDateStart = faker.date.past();
  const sourceDateEnd = faker.date.between({ from: sourceDateStart, to: new Date() });
  const minResolutionMeter = faker.number.int({ max: maxResolutionMeter });
  const id = faker.word.sample();
  const footprint = FOOTPRINT;
  const wktGeometry = WKT_GEOMETRY;
  const metadata: Metadata = {
    type: RecordType.RECORD_3D,
    productName: faker.word.sample(),
    productType: ProductType.PHOTO_REALISTIC_3D,
    description: faker.word.words(),
    creationDate: faker.date.past(),
    sourceDateStart: sourceDateStart,
    sourceDateEnd: sourceDateEnd,
    minResolutionMeter: minResolutionMeter,
    maxResolutionMeter: faker.number.int({ min: minResolutionMeter, max: maxResolutionMeter }),
    maxAccuracyCE90: faker.number.int({ max: noDataAccuracy }),
    absoluteAccuracyLE90: faker.number.int({ max: noDataAccuracy }),
    accuracySE90: faker.number.int({ max: maxSE90 }),
    relativeAccuracySE90: faker.number.int({ max: maxAccuracy }),
    visualAccuracy: faker.number.int({ max: maxAccuracy }),
    footprint,
    heightRangeFrom: faker.number.int({ max: noDataAccuracy }),
    heightRangeTo: faker.number.int({ max: noDataAccuracy }),
    srsId: faker.word.sample(),
    srsName: faker.word.sample(),
    classification: faker.word.sample(),
    productionSystem: faker.word.sample(),
    productionSystemVer: faker.word.sample(),
    producerName: faker.word.sample(),
    minFlightAlt: faker.number.int({ max: noDataAccuracy }),
    maxFlightAlt: faker.number.int({ max: noDataAccuracy }),
    geographicArea: faker.word.sample(),
    productSource: faker.word.sample(),
    wktGeometry,
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
    sensors: [faker.word.sample()].join(', '),
    region: [faker.word.sample()].join(', '),
    links: linksToString(linksPattern),
  };
  return metadata;
};

export const createUpdatePayload = (): IUpdatePayload => {
  const payload: IUpdatePayload = {
    ...createIUpdate(),
    sensors: [faker.word.sample()],
  };
  return payload;
};

export const createUpdateStatus = (): IUpdateStatus => {
  const metadata: IUpdateStatus = {
    productStatus: RecordStatus.PUBLISHED,
  };
  return metadata;
};

export const createUuid = (): string => {
  return faker.string.uuid();
};

import RandExp from 'randexp';
import faker from 'faker';
import { RecordType, ProductType, RecordStatus } from '@map-colonies/mc-model-types';
import { Metadata } from '../../src/metadata/models/generated';
import { IPayload, IUpdateMetadata, IUpdatePayload, IUpdateStatus } from '../../src/common/dataModels/records';
import { linksToString } from '../../src/common/utils/format';

const classificationHelper = new RandExp('^[0-9]$').gen();
const productBoundingBoxHelper = new RandExp('^([-+]?(0|[1-9]\\d*)(\\.\\d+)?,){3}[-+]?(0|[1-9]\\d*)(\\.\\d+)?$').gen();
const listOfRandomWords = ['avi', 'אבי', 'lalalalala', 'וןםפ'];
const years = 4;

const minX = faker.datatype.number({ min: -180, max: 179 });
const minY = faker.datatype.number({ min: -180, max: 179 });
const maxX = faker.datatype.number({ min: minX, max: 180 });
const maxY = faker.datatype.number({ min: minY, max: 180 });
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
  const minResolutionMeter = faker.datatype.number(maxResolutionMeter);
  const payload: IUpdatePayload = {
    productName: Math.floor(Math.random() * listOfRandomWords.length).toString() + '',
    description: faker.random.word(),
    creationDate: faker.date.past(),
    classification: faker.random.word(),
    minResolutionMeter: minResolutionMeter,
    maxResolutionMeter: faker.datatype.number({ min: minResolutionMeter, max: maxResolutionMeter }),
    maxAccuracyCE90: faker.datatype.number(noDataAccuracy),
    absoluteAccuracyLE90: faker.datatype.number(noDataAccuracy),
    accuracySE90: faker.datatype.number(maxSE90),
    relativeAccuracySE90: faker.datatype.number(maxAccuracy),
    visualAccuracy: faker.datatype.number(maxAccuracy),
    heightRangeFrom: faker.datatype.number(),
    heightRangeTo: faker.datatype.number(),
    producerName: faker.random.word(),
    minFlightAlt: faker.datatype.number(),
    maxFlightAlt: faker.datatype.number(),
    geographicArea: faker.random.word(),
  };
  return payload;
}

export const createFakePayload = (): IPayload => {
  const sourceDateEnd = faker.date.past();
  const sourceDateStart = faker.date.past(years, sourceDateEnd);
  const minResolutionMeter = faker.datatype.number(maxResolutionMeter);
  const record: IPayload = {
    id: faker.datatype.uuid(),
    productId: undefined,
    type: RecordType.RECORD_3D,
    productName: Math.floor(Math.random() * listOfRandomWords.length).toString() + '',
    productType: ProductType.PHOTO_REALISTIC_3D,
    description: Math.floor(Math.random() * listOfRandomWords.length).toString(),
    creationDate: faker.date.past(),
    sourceDateStart: sourceDateStart,
    sourceDateEnd: sourceDateEnd,
    minResolutionMeter: minResolutionMeter,
    maxResolutionMeter: faker.datatype.number({ min: minResolutionMeter, max: maxResolutionMeter }),
    maxAccuracyCE90: faker.datatype.number(noDataAccuracy),
    absoluteAccuracyLE90: faker.datatype.number(noDataAccuracy),
    accuracySE90: faker.datatype.number(maxSE90),
    relativeAccuracySE90: faker.datatype.number(maxAccuracy),
    visualAccuracy: faker.datatype.number(maxAccuracy),
    sensors: [faker.random.word()],
    footprint: FOOTPRINT as GeoJSON.Geometry,
    heightRangeFrom: faker.datatype.number(),
    heightRangeTo: faker.datatype.number(),
    srsId: faker.random.word(),
    srsName: faker.random.word(),
    region: [faker.random.word()],
    classification: classificationHelper,
    productionSystem: faker.random.word(),
    productionSystemVer: Math.floor(Math.random() * listOfRandomWords.length).toString(),
    producerName: faker.random.word(),
    minFlightAlt: faker.datatype.number(),
    maxFlightAlt: faker.datatype.number(),
    geographicArea: faker.random.word(),
    productSource: faker.random.word(),
    productStatus: RecordStatus.UNPUBLISHED,
    links: linksPattern,
  };
  return record;
};

export const createFakeMetadata = (): Metadata => {
  const sourceDateEnd = faker.date.past();
  const sourceDateStart = faker.date.past(years, sourceDateEnd);
  const minResolutionMeter = faker.datatype.number(maxResolutionMeter);
  const id = faker.datatype.uuid();
  const metadata: Metadata = {
    type: RecordType.RECORD_3D,
    productName: Math.floor(Math.random() * listOfRandomWords.length).toString() + '',
    productType: ProductType.PHOTO_REALISTIC_3D,
    description: Math.floor(Math.random() * listOfRandomWords.length).toString(),
    creationDate: faker.date.past(),
    sourceDateStart: sourceDateStart,
    sourceDateEnd: sourceDateEnd,
    minResolutionMeter: minResolutionMeter,
    maxResolutionMeter: faker.datatype.number({ min: minResolutionMeter, max: maxResolutionMeter }),
    maxAccuracyCE90: faker.datatype.number(noDataAccuracy),
    absoluteAccuracyLE90: faker.datatype.number(noDataAccuracy),
    accuracySE90: faker.datatype.number(maxSE90),
    relativeAccuracySE90: faker.datatype.number(maxAccuracy),
    visualAccuracy: faker.datatype.number(maxAccuracy),
    footprint: FOOTPRINT as GeoJSON.Geometry,
    heightRangeFrom: faker.datatype.number(),
    heightRangeTo: faker.datatype.number(),
    srsId: faker.random.word(),
    srsName: faker.random.word(),
    classification: classificationHelper,
    productionSystem: faker.random.word(),
    productionSystemVer: Math.floor(Math.random() * listOfRandomWords.length).toString(),
    producerName: faker.random.word(),
    minFlightAlt: faker.datatype.number(),
    maxFlightAlt: faker.datatype.number(),
    geographicArea: faker.random.word(),
    productSource: faker.random.word(),
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
    sensors: [faker.random.word()].join(', '),
    region: [faker.random.word()].join(', '),
    links: linksToString(linksPattern),
  };
  return metadata;
};

export const createFakeUpdatePayload = (): IUpdatePayload => {
  const payload: IUpdatePayload = {
    ...createFakeIUpdate(),
    sensors: [faker.random.word()],
  };
  return payload;
};

export const createFakeUpdateMetadata = (): IUpdateMetadata => {
  const metadata: IUpdateMetadata = {
    ...createFakeIUpdate(),
    sensors: faker.random.word(),
  };
  return metadata;
};

export const createFakeUpdateStatus = (): IUpdateStatus => {
  const metadata: IUpdateStatus = {
    productStatus: RecordStatus.PUBLISHED,
  };
  return metadata;
};

export const createFakeID = (): string => {
  return faker.datatype.uuid();
};

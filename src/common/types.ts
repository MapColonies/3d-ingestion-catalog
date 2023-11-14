import { I3DCatalogUpsertRequestBody } from '@map-colonies/mc-model-types';

export type IPayload = Omit<I3DCatalogUpsertRequestBody, 'productVersion' | 'productBoundingBox' | 'updateDate'>;

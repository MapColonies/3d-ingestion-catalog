import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { MetadataController } from '../controllers/metadataController';

const metadataRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(MetadataController);

  router.get('/', controller.getAll);
  router.get('/:identifier', controller.get);
  router.get('/lastVersion/:identifier', controller.findLastVersion);
  router.post('/', controller.post);
  router.post('/find', controller.findRecords);
  router.patch('/:identifier', controller.patch);
  router.delete('/:identifier', controller.delete);
  router.patch('/status/:identifier', controller.updateStatus);

  return router;
};

export const METADATA_ROUTER_SYMBOL = Symbol('metadataRouterFactory');

export { metadataRouterFactory };

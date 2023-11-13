import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { MetadataController } from '../controllers/metadataController';

const metadataRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(MetadataController);

  router.get('/', controller.getAll);
  router.get('/:identifier', controller.get);
  router.post('/', controller.post);
  router.patch('/:identifier', controller.patch);
  router.delete('/:identifier', controller.delete);
  router.patch('/status/:identifier', controller.updateStatus);

  return router;
};

export { metadataRouterFactory };

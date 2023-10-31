import express from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import { OpenapiViewerRouter, OpenapiRouterConfig } from '@map-colonies/openapi-express-viewer';
import httpLogger from '@map-colonies/express-access-log-middleware';
import { getErrorHandlerMiddleware } from '@map-colonies/error-express-handler';
import { Logger } from '@map-colonies/js-logger';
import { middleware as OpenApiMiddleware } from 'express-openapi-validator';
import { container, inject, injectable } from 'tsyringe';
import { SERVICES } from './common/constants';
import { IConfig } from './common/interfaces';
import { metadataRouterFactory } from './metadata/routes/metadataRouter';

@injectable()
export class ServerBuilder {
  private readonly serverInstance: express.Application;

  public constructor(@inject(SERVICES.CONFIG) private readonly config: IConfig, @inject(SERVICES.LOGGER) private readonly logger: Logger) {
    this.serverInstance = express();
  }

  public build(): express.Application {
    this.registerPreRoutesMiddleware();
    this.buildRoutes();
    this.registerPostRoutesMiddleware();

    return this.serverInstance;
  }

  private buildDocsRoutes(): void {
    const openapiRouter = new OpenapiViewerRouter({
    ...this.config.get<OpenapiRouterConfig>('openapiConfig'),
    filePathOrSpec: this.config.get<string>('openapiConfig.filePath'),
  });
  openapiRouter.setup();
  this.serverInstance.use(this.config.get<string>('openapiConfig.basePath'), openapiRouter.getRouter());
}

  private buildRoutes(): void {
    this.serverInstance.use('/metadata', metadataRouterFactory(container));
    this.buildDocsRoutes();
  }

  private registerPreRoutesMiddleware(): void {
    this.serverInstance.use(httpLogger({ logger: this.logger }));

    if (this.config.get<boolean>('server.response.compression.enabled')) {
      this.serverInstance.use(compression(this.config.get<compression.CompressionFilter>('server.response.compression.options')));
    }

    this.serverInstance.use(bodyParser.json(this.config.get<bodyParser.Options>('server.request.payload')));

    const ignorePathRegex = new RegExp(`^${this.config.get<string>('openapiConfig.basePath')}/.*`, 'i');
    const apiSpecPath = this.config.get<string>('openapiConfig.filePath');
    this.serverInstance.use(OpenApiMiddleware({ apiSpec: apiSpecPath, validateRequests: true, ignorePaths: ignorePathRegex }));
  }

  private registerPostRoutesMiddleware(): void {
    this.serverInstance.use(getErrorHandlerMiddleware());
  }
}

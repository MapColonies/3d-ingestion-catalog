import axios from 'axios';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from '../../common/constants';
import { DeleteRequest, IConfig } from '../../common/interfaces';
import { StoreTriggerResponse, StoreTriggerConfig } from './interfaces';

@injectable()
export class StoreTriggerCall {
  private readonly storeTrigger: StoreTriggerConfig;

  public constructor(@inject(SERVICES.CONFIG) private readonly config: IConfig, @inject(SERVICES.LOGGER) private readonly logger: Logger) {
    this.storeTrigger = this.config.get<StoreTriggerConfig>('storeTrigger');
  }

  public async createFlow(payload: DeleteRequest): Promise<StoreTriggerResponse> {
    this.logger.debug({
      msg: 'got a request for a new flow',
      modelId: payload.modelId,
      modelLink: payload.modelLink,
    });
    const response = await axios.post<StoreTriggerResponse>(`${this.storeTrigger.url}/${this.storeTrigger.subUrl}`, payload);
    this.logger.info({
      msg: 'sent to store-trigger successfully',
      jobId: response.data.jobID,
      modelId: payload.modelId,
      modelLink: payload.modelLink,
      payload,
    });
    return response.data;
  }
}

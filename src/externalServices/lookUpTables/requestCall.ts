import axios from 'axios';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from '../../common/constants';
import { IConfig } from '../../common/interfaces';
import { ILookupOption, LookupTablesConfig } from './interfaces';

@injectable()
export class LookupTablesCall {
  private readonly lookupTables: LookupTablesConfig;

  public constructor(@inject(SERVICES.CONFIG) private readonly config: IConfig, @inject(SERVICES.LOGGER) private readonly logger: Logger) {
    this.lookupTables = this.config.get<LookupTablesConfig>('lookupTables');
  }

  public async getClassifications(): Promise<string[]> {
    this.logger.debug({
      msg: 'Get Classifications from lookup-tables service',
    });
    const response = await axios.get<ILookupOption[]>(`${this.lookupTables.url}/lookup-tables/lookupData/classification`);
    const classifications: string[] = [];
    for (const item of response.data) {
      classifications.push(item.value);
    }
    this.logger.debug({
      msg: 'Got Classifications',
      classifications,
    });
    return classifications;
  }
}

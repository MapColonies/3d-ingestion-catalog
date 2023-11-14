import * as supertest from 'supertest';
import { IUpdatePayload, IUpdateStatus } from '../../../../src/common/interfaces';
import { IPayload } from '../../../../src/common/types';

export class MetadataRequestSender {
  public constructor(private readonly app: Express.Application) {}

  public async getAll(): Promise<supertest.Response> {
    return supertest.agent(this.app).get('/metadata').set('Content-Type', 'application/json');
  }

  public async getRecord(identifier: string): Promise<supertest.Response> {
    return supertest.agent(this.app).get(`/metadata/${identifier}`).set('Content-Type', 'application/json');
  }

  public async createRecord(payload: IPayload): Promise<supertest.Response> {
    return supertest.agent(this.app).post('/metadata').set('Content-Type', 'application/json').send(payload);
  }

  public async updateRecord(identifier: string, payload: IUpdatePayload): Promise<supertest.Response> {
    return supertest.agent(this.app).patch(`/metadata/${identifier}`).set('Content-Type', 'application/json').send(payload);
  }

  public async deleteRecord(identifier: string): Promise<supertest.Response> {
    return supertest.agent(this.app).delete(`/metadata/${identifier}`).set('Content-Type', 'application/json');
  }

  public async updateStatusRecord(identifier: string, payload: IUpdateStatus): Promise<supertest.Response> {
    return supertest.agent(this.app).patch(`/metadata/status/${identifier}`).set('Content-Type', 'application/json').send(payload);
  }

  public async findLastVersion(identifier: string): Promise<supertest.Response> {
    return supertest.agent(this.app).get(`/metadata/${identifier}`).set('Content-Type', 'application/json');
  }
}

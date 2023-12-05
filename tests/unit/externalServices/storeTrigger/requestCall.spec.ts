import mockAxios from 'jest-mock-axios';
import config from 'config';
import jsLogger from '@map-colonies/js-logger';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { createFakeDeleteRequest, createUuid } from '../../../helpers/helpers';
import { StoreTriggerCall } from '../../../../src/externalServices/storeTrigger/requestCall';
import { StoreTriggerConfig, StoreTriggerResponse } from '../../../../src/externalServices/storeTrigger/interfaces';

let storeTrigger: StoreTriggerCall;

describe('StoreTriggerCall', () => {
    beforeEach(() => {
        storeTrigger = new StoreTriggerCall(config, jsLogger({ enabled: false }));
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createFlow Function', () => {
        it('resolves without errors', async () => {
            const storeTriggerConfig = config.get<StoreTriggerConfig>('storeTrigger');
            const request = createFakeDeleteRequest('string,string,string,https://9x[Nx^j*.Y#%XQLe=PcDM;ZRQ<`Fu;;RY/ WVdwB');
            const expected: StoreTriggerResponse = {
                jobID: createUuid(),
                status: OperationStatus.IN_PROGRESS
            };
            mockAxios.post.mockResolvedValue({ data: expected });

            const created = await storeTrigger.createFlow(request);

            expect(mockAxios.post).toHaveBeenCalledWith(`${storeTriggerConfig.url}/${storeTriggerConfig.subUrl}`, request);
            expect(created).toMatchObject(expected);
        });
    })
})

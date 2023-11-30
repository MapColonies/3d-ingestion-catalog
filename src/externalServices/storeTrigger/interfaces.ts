import { OperationStatus } from '@map-colonies/mc-priority-queue';

export interface StoreTriggerResponse {
  jobID: string;
  status: OperationStatus.IN_PROGRESS;
}

export interface StoreTriggerConfig {
  url: string;
  subUrl: string;
}

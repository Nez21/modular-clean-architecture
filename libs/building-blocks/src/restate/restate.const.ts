import { MetadataKey } from '@internal/common'

import type { ObjectMetadata, WorkflowMetadata } from './restate.interface'
import { type ServiceMetadata } from './restate.interface'

export const MetadataKeys = {
  Service: MetadataKey<ServiceMetadata>('Service'),
  Object: MetadataKey<ObjectMetadata>('Object'),
  Workflow: MetadataKey<WorkflowMetadata>('Workflow'),
  Handler: 'Handler',
  SharedHandler: 'SharedHandler'
} as const

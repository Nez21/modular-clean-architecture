import { SetTypedMetadata } from '@internal/common'

import { SetMetadata } from '@nestjs/common'

import { MetadataKeys } from './restate.const'
import type { IRestateHandler, IRestateSharedHandler, IRestateWorkflow, ServiceMetadata } from './restate.interface'

export const RestateService = (name: string, options?: Omit<ServiceMetadata, 'name'>): ClassDecorator =>
  SetTypedMetadata(MetadataKeys.Service, { name, ...options })
export const RestateObject = (name: string, options?: Omit<ServiceMetadata, 'name'>): ClassDecorator =>
  SetTypedMetadata(MetadataKeys.Object, { name, ...options })
export const RestateWorkflow = (
  name: string,
  options?: Omit<ServiceMetadata, 'name'>
): TypedClassDecorator<'extend', 'target', IRestateWorkflow> =>
  SetTypedMetadata(MetadataKeys.Workflow, { name, ...options })
export const Handler: TypedMethodDecorator<'extend', 'target', IRestateHandler> = SetMetadata(
  MetadataKeys.Handler,
  true
)
export const SharedHandler: TypedMethodDecorator<'extend', 'target', IRestateSharedHandler> = SetMetadata(
  MetadataKeys.SharedHandler,
  true
)

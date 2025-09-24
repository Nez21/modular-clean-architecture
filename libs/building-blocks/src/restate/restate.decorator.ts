import { SetMetadata } from '@nestjs/common'

import { SetTypedMetadata } from '@internal/common'

import { MetadataKeys } from './restate.const'
import type { IRestateWorkflow, IRestateHandler, IRestateSharedHandler, ServiceMetadata } from './restate.interface'

export const RestateService = (name: string, options?: Omit<ServiceMetadata, 'name'>): ClassDecorator =>
  SetTypedMetadata(MetadataKeys.Service, { name, ...options })
export const RestateObject = (name: string, options?: Omit<ServiceMetadata, 'name'>): ClassDecorator =>
  SetTypedMetadata(MetadataKeys.Object, { name, ...options })
export const RestateWorkflow = (
  name: string,
  options?: Omit<ServiceMetadata, 'name'>
): TypedClassDecorator<'inherit', 'target', IRestateWorkflow> =>
  SetTypedMetadata(MetadataKeys.Workflow, { name, ...options })
export const Handler: TypedMethodDecorator<'inherit', 'target', IRestateHandler> = SetMetadata(
  MetadataKeys.Handler,
  true
)
export const SharedHandler: TypedMethodDecorator<'inherit', 'target', IRestateSharedHandler> = SetMetadata(
  MetadataKeys.SharedHandler,
  true
)

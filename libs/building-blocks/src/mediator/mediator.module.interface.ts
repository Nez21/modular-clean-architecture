import type { TokenFn } from '@internal/common'
import { Token } from '@internal/common'

import type { BasePipelineBehavior } from './pipeline-behavior.interface'

export interface MediatorModuleOptions {
  defaultBehaviors?: NonEmptyArray<TokenFn<BasePipelineBehavior> | Class<BasePipelineBehavior>>
}

export const MediatorModuleOptions = Token<MediatorModuleOptions | undefined>('MediatorModuleOptions')

import { Token } from '@internal/common'

import { AcquireOptions } from './distributed-lock.interface'

export interface DistributedLockModuleOptions extends DeepPartial<AcquireOptions> {
  prefix?: string
}

export const DistributedLockModuleOptions = Token<DistributedLockModuleOptions>('DistributedLockModuleOptions')

import { Token } from '@internal/common'

import ms from 'ms'

export interface AcquireOptions {
  ttl: ms.StringValue
  retry: {
    count: number
    delay: ms.StringValue
    jitter: ms.StringValue
  }
}

export interface IDistributedLockService {
  acquire<T>(keys: string[], action: Action<T>, options?: DeepPartial<AcquireOptions>): Promise<T>
  tryAcquire(keys: string[], options?: DeepPartial<AcquireOptions>): Promise<boolean>
  release(keys: string[]): Promise<void>
}

export const IDistributedLockService = Token<IDistributedLockService>('IDistributedLockService')

import { Token } from '@internal/common'

import type ms from 'ms'

export interface CacheModuleOptions {
  connectionString: string
  prefix?: string
  defaultTTL?: ms.StringValue
}

export const CacheModuleOptions = Token<CacheModuleOptions>('CacheModuleOptions')

import type ms from 'ms'

import { Token } from '@internal/common'

export interface CacheModuleOptions {
  connectionString: string
  prefix?: string
  defaultTTL?: ms.StringValue
}

export const CacheModuleOptions = Token<CacheModuleOptions>('CacheModuleOptions')

import type { GlideClient } from '@valkey/valkey-glide'

import type ms from 'ms'

import { Token } from '@internal/common'

export type CacheKey<TType = unknown> = string & { __type: TType }

export const CacheKey = <TType>(key: string) => key as CacheKey<TType>

export interface ICacheService {
  hasKey(key: string): Promise<boolean>
  keyValueGet<TKey extends CacheKey>(key: TKey): Promise<TKey['__type'] | undefined>
  keyValueSet<TKey extends CacheKey>(key: TKey, value: TKey['__type'], ttl?: ms.StringValue): Promise<void>
  keyValueDelete(...keys: string[]): Promise<void>
  setAdd(key: string, values: string[]): Promise<void>
  setHas(key: string, value: string): Promise<boolean>
  setDelete(key: string, values: string[]): Promise<void>
  expire(key: string, ttl: ms.StringValue): Promise<void>
  remainingTimeInSeconds(key: string): Promise<{ type: 'miss' | 'infinite' } | { type: 'remaining'; duration: number }>
  assignTags(keys: string[], tags: string[]): Promise<void>
  deleteByTags(...tags: string[]): Promise<void>
  batchCacheAside<TParams, TResult>(
    keysParams: TParams[],
    pattern: (keyParams: TParams) => CacheKey<TResult>,
    resolver: (keysParams: TParams[]) => Promise<(TResult | undefined)[]>,
    options: {
      ttl?: ms.StringValue
      tags?: string[]
    }
  ): Promise<(TResult | undefined)[]>
  cacheAside<TResult>(
    key: CacheKey<TResult>,
    resolver: () => Promise<TResult>,
    options: {
      ttl?: ms.StringValue
      tags?: string[]
    }
  ): Promise<TResult | undefined>
}

export const ICacheService = Token<ICacheService>('ICacheService')

export type ValkeyClient = GlideClient

export const ValkeyClient = Token<ValkeyClient>('ValkeyClient')

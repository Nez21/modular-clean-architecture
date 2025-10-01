import { deserialize, serialize } from '@internal/common'

import { Inject, Injectable, Logger } from '@nestjs/common'
import { Batch, GlideString, TimeUnit } from '@valkey/valkey-glide'
import ms from 'ms'

import { DefaultCacheTTL } from './cache.const'
import { CacheModuleOptions } from './cache.module.types'
import { CacheKey, ICacheService, ValkeyClient } from './cache.service.interface'

@Injectable()
export class CacheService implements ICacheService {
  public static readonly logger = new Logger(CacheService.name)

  private readonly prefix: string
  private readonly defaultTTL: ms.StringValue

  constructor(
    @Inject(ValkeyClient) private readonly valkey: ValkeyClient,
    @Inject(CacheModuleOptions) options: CacheModuleOptions
  ) {
    this.prefix = options.prefix || ''
    this.defaultTTL = options.defaultTTL || DefaultCacheTTL
  }

  private getPrefixedKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key
  }

  private getCacheTagKey(tag: string): string {
    return this.getPrefixedKey(`tag:${tag}`)
  }

  private serializeValue<T>(value: T): GlideString {
    if (value instanceof Buffer) return value

    return serialize(value)
  }

  private deserializeValue<T>(value: GlideString | null | undefined): T | undefined {
    if (!value) return

    if (value instanceof Buffer) return value as unknown as T

    return deserialize<T>(value.toString())
  }

  async hasKey(key: string): Promise<boolean> {
    return (await this.valkey.exists([this.getPrefixedKey(key)])) === 1
  }

  async keyValueGet<TKey extends CacheKey>(key: TKey): Promise<TKey['__type'] | undefined> {
    return this.deserializeValue<TKey['__type']>(await this.valkey.get(this.getPrefixedKey(key)))
  }

  async keyValueSet<TKey extends CacheKey>(key: TKey, value: TKey['__type'], ttl?: ms.StringValue): Promise<void> {
    await this.valkey.set(this.getPrefixedKey(key), this.serializeValue(value), {
      expiry: {
        type: TimeUnit.Seconds,
        count: ms(ttl ?? this.defaultTTL) / 1000
      }
    })
  }

  async keyValueDelete(...keys: string[]): Promise<void> {
    if (keys.length === 0) return

    await this.valkey.del(keys.map((key) => this.getPrefixedKey(key)))
  }

  async setAdd(key: string, values: string[]): Promise<void> {
    await this.valkey.sadd(this.getPrefixedKey(key), values)
  }

  async setHas(key: string, value: string): Promise<boolean> {
    return await this.valkey.smismember(this.getPrefixedKey(key), [value]).then((result) => result.includes(true))
  }

  async setDelete(key: string, values: string[]): Promise<void> {
    if (values.length === 0) return

    await this.valkey.srem(this.getPrefixedKey(key), values)
  }

  async expire(key: string, ttl: ms.StringValue): Promise<void> {
    await this.valkey.expire(this.getPrefixedKey(key), ms(ttl) / 1000)
  }

  async remainingTimeInSeconds(
    key: string
  ): Promise<{ type: 'miss' | 'infinite' } | { type: 'remaining'; duration: number }> {
    const duration = await this.valkey.ttl(this.getPrefixedKey(key))

    if (duration === -1) {
      return { type: 'infinite' }
    }

    if (duration === -2) {
      return { type: 'miss' }
    }

    return { type: 'remaining', duration }
  }

  async assignTags(keys: string[], tags: string[]): Promise<void> {
    if (keys.length === 0 || tags.length === 0) return

    const batch = new Batch(true)

    for (const tag of tags) {
      batch.sadd(
        this.getCacheTagKey(tag),
        keys.map((key) => this.getPrefixedKey(key))
      )
    }

    await this.valkey.exec(batch, true)
  }

  async deleteByTags(...tags: string[]): Promise<void> {
    if (tags.length === 0) return

    const tagKeys = tags.map((tag) => this.getCacheTagKey(tag))

    for (const tagKey of tagKeys) {
      let cursor: GlideString = '0'

      do {
        const [nextCursor, keys] = await this.valkey.sscan(tagKey, cursor, { count: 100 })
        cursor = nextCursor

        if (keys.length > 0) {
          await this.valkey.unlink(keys.map((key) => key.toString()))
        }
      } while (cursor.toString() !== '0')
    }

    await this.valkey.unlink(tagKeys)
  }

  async batchCacheAside<TParams, TResult>(
    keysParams: TParams[],
    pattern: (keyParams: TParams) => CacheKey<TResult>,
    resolver: (keysParams: TParams[]) => Promise<(TResult | undefined)[]>,
    options: {
      ttl?: ms.StringValue
      tags?: string[]
    }
  ): Promise<(TResult | undefined)[]> {
    if (keysParams.length === 0) return []

    const keys = keysParams.map((keyParams) => this.getPrefixedKey(pattern(keyParams)) as CacheKey<TResult>)
    const values = await this.valkey
      .mget(keys)
      .then((values) => values.map((value) => this.deserializeValue<TResult>(value)))
    const cacheMissKeyParams = keysParams.filter((_, index) => !values[index])

    if (cacheMissKeyParams.length > 0) {
      const results = await resolver(cacheMissKeyParams)
      const hitKeys: string[] = []
      const batch = new Batch(true)

      for (const [index, keyParams] of cacheMissKeyParams.entries()) {
        if (!results[index]) continue

        const key = this.getPrefixedKey(pattern(keyParams)) as CacheKey<TResult>
        hitKeys.push(key)
        values[keys.indexOf(key)] = results[index]

        batch.set(key, this.serializeValue(results[index]))
        const ttl = ms(options.ttl ?? this.defaultTTL)

        if (ttl !== 0) {
          batch.expire(key, ttl / 1000)
        }
      }

      for (const tag of options.tags || []) {
        batch.sadd(this.getCacheTagKey(tag), hitKeys)
      }

      await this.valkey.exec(batch, true)
    }

    return values
  }

  async cacheAside<TResult>(
    key: CacheKey<TResult>,
    resolver: () => Promise<TResult>,
    options: { ttl?: ms.StringValue; tags?: string[] }
  ): Promise<Awaited<TResult> | undefined> {
    return await this.batchCacheAside(
      [key],
      () => key,
      async () => [await resolver()],
      options
    ).then((values) => values[0])
  }
}

import { randomUUID } from 'node:crypto'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { TimeUnit } from '@valkey/valkey-glide'
import ms from 'ms'
import { defer, from, lastValueFrom, retry, timer } from 'rxjs'

import { ValkeyClient } from '#/cache'

import { AcquireOptions, IDistributedLockService } from './distributed-lock.interface'
import { DistributedLockModuleOptions } from './distributed-lock.module.types'

@Injectable()
export class DistributedLockService implements IDistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name)
  private readonly lockValue = randomUUID()

  constructor(
    @Inject(ValkeyClient) private readonly valkey: ValkeyClient,
    @Inject(DistributedLockModuleOptions) private readonly moduleOptions: DistributedLockModuleOptions
  ) {}

  async acquire<T>(keys: string[], action: Action<T>, options?: DeepPartial<AcquireOptions>): Promise<T> {
    const mergedOptions = this.mergeOptions(options)
    const lockKeys = keys.map((key) => this.getLockKey(key))

    this.logger.debug(`Attempting to acquire locks for keys: ${keys.join(', ')}`)

    try {
      await this.tryAcquireLocks(lockKeys, mergedOptions)
      return await Promise.resolve(action())
    } finally {
      await this.releaseLocks(lockKeys)
    }
  }

  async tryAcquire(keys: string[], options?: DeepPartial<AcquireOptions>): Promise<boolean> {
    const mergedOptions = this.mergeOptions(options)
    const lockKeys = keys.map((key) => this.getLockKey(key))

    try {
      await this.tryAcquireLocks(lockKeys, mergedOptions)
      return true
    } catch (error) {
      this.logger.warn(`Failed to acquire locks: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }

  async release(keys: string[]): Promise<void> {
    const lockKeys = keys.map((key) => this.getLockKey(key))

    await this.releaseLocks(lockKeys)
  }

  private mergeOptions(options?: DeepPartial<AcquireOptions>): AcquireOptions {
    return {
      ttl: options?.ttl ?? this.moduleOptions.ttl,
      retry: {
        count: options?.retry?.count ?? this.moduleOptions.retry.count,
        delay: options?.retry?.delay ?? this.moduleOptions.retry.delay,
        jitter: options?.retry?.jitter ?? this.moduleOptions.retry.jitter
      }
    }
  }

  private getLockKey(key: string): string {
    return [this.moduleOptions.prefix, 'lock', key].filter(Boolean).join(':')
  }

  private calculateRetryDelay(delay: ms.StringValue, jitter: ms.StringValue): number {
    return ms(delay) * 2 + Math.random() * ms(jitter)
  }

  private async tryAcquireLocks(lockKeys: string[], options: AcquireOptions): Promise<void> {
    const fn = async () => {
      const acquiredKeys: string[] = []

      try {
        for (const lockKey of lockKeys) {
          const success = await this.valkey.set(lockKey, this.lockValue, {
            conditionalSet: 'onlyIfDoesNotExist',
            expiry: {
              type: TimeUnit.Milliseconds,
              count: ms(options.ttl)
            }
          })

          if (success) {
            acquiredKeys.push(lockKey)
          } else {
            throw new Error(`Lock for key ${lockKey} already exists`)
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to acquire locks: ${error instanceof Error ? error.message : String(error)}`)

        if (acquiredKeys.length > 0) {
          await this.valkey.del(acquiredKeys)
        }

        throw error
      }
    }

    await lastValueFrom(
      defer(() => from(fn())).pipe(
        retry({
          count: options.retry.count,
          delay: () => timer(this.calculateRetryDelay(options.retry.delay, options.retry.jitter)),
          resetOnSuccess: true
        })
      )
    )
  }

  private async releaseLocks(acquiredKeys: string[]): Promise<void> {
    if (acquiredKeys.length === 0) return

    const values = await this.valkey.mget(acquiredKeys)

    if (values.length !== acquiredKeys.length) {
      this.logger.warn('Some locks were not acquired')
    }

    if (values.some((value) => value !== this.lockValue)) {
      throw new Error('Lock values do not match')
    }

    await this.valkey.del(acquiredKeys)
  }
}

import { applyDecorators } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import ms from 'ms'
import hash, { type NotUndefined } from 'object-hash'
import { defer, delayWhen, mergeMap, of, throwError } from 'rxjs'
import { kebabCase } from 'string-ts'

import { CacheKey, ICacheService } from '#/cache'
import { IDistributedLockService } from '#/distributed-lock/distributed-lock.interface'
import { IRequestContextService } from '#/request-context'

import { wrapPipeline } from './resilience.utils'

export type IdempotentOptions =
  | {
      key: 'idempotentKey'
      cacheTTL: ms.StringValue
      executionTimeout: ms.StringValue
      retry: {
        count: number
        delay: ms.StringValue
        jitter: ms.StringValue
      }
    }
  | {
      key: 'requestHash'
      keyIndex: number
      cacheTTL: ms.StringValue
      executionTimeout: ms.StringValue
      retry: {
        count: number
        delay: ms.StringValue
        jitter: ms.StringValue
      }
    }

const defaultOptions: IdempotentOptions = {
  key: 'requestHash',
  keyIndex: 0,
  cacheTTL: '1 minute',
  executionTimeout: '5 seconds',
  retry: {
    count: 10,
    delay: '200ms',
    jitter: '100ms'
  }
}

type TypedDecorator = TypedMethodDecorator<'inherit', 'target', (...args: NonEmptyArray<any>) => Promise<any>>

export const UseIdempotent = (options?: Partial<IdempotentOptions>): TypedDecorator => {
  const idempotentOptions: IdempotentOptions = {
    ...defaultOptions,
    ...options,
    retry: {
      ...defaultOptions.retry,
      ...options?.retry
    }
  }

  return applyDecorators(
    (target: object) => {
      Inject(ICacheService)(target, 'cacheService')
      Inject(IDistributedLockService)(target, 'distributedLockService')
      idempotentOptions.key === 'idempotentKey' && Inject(IRequestContextService)(target, 'requestContextService')
    },
    wrapPipeline(async (args, next, ctx) => {
      const { cacheService, distributedLockService, requestContextService } = ctx.instance as {
        cacheService: ICacheService
        distributedLockService: IDistributedLockService
        requestContextService: IRequestContextService
      }

      const requestId =
        idempotentOptions.key === 'idempotentKey'
          ? `${kebabCase(ctx.class.name)}:${requestContextService.current.idempotencyKey}`
          : `${kebabCase(ctx.class.name)}:${hash((args[idempotentOptions.keyIndex] ?? '') as NotUndefined)}`
      const cachedResultKey = CacheKey<unknown>(`${requestId}:result`)

      let cachedResult = await cacheService.keyValueGet(cachedResultKey)

      if (cachedResult) {
        return of(cachedResult)
      }

      try {
        const isAcquired = await distributedLockService.tryAcquire([requestId], {
          ttl: idempotentOptions.executionTimeout,
          retry: idempotentOptions.retry
        })

        if (!isAcquired) {
          return throwError(() => new Error('Failed to acquire lock'))
        }

        cachedResult = await cacheService.keyValueGet(cachedResultKey)

        if (cachedResult) {
          await distributedLockService.release([requestId])
          return of(cachedResult)
        }

        return next.handle().pipe(
          mergeMap((result) =>
            of(result).pipe(
              delayWhen(() =>
                defer(async () => {
                  await cacheService.keyValueSet(cachedResultKey, result, idempotentOptions.cacheTTL)
                  await distributedLockService.release([requestId])
                })
              )
            )
          )
        )
      } catch (error) {
        await distributedLockService.release([requestId])
        return throwError(() => error)
      }
    })
  ) as TypedDecorator
}

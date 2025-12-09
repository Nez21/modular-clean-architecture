import { wrapPipeline } from '@internal/common'

import { applyDecorators } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import ms from 'ms'
import hash, { type NotUndefined } from 'object-hash'
import { defer, delayWhen, mergeMap, of, throwError } from 'rxjs'
import { kebabCase } from 'string-ts'

import { CacheKey, ICacheService } from '#/cache'
import { IDistributedLockService } from '#/distributed-lock/distributed-lock.interface'
import { IRequestContextService } from '#/request-context'

export type IdempotentOptions = {
  keyIndex: number
  cacheTtl: ms.StringValue
  executionTimeout: ms.StringValue
  retry: {
    count: number
    delay: ms.StringValue
    jitter: ms.StringValue
  }
}

const defaultOptions: IdempotentOptions = {
  keyIndex: 0,
  cacheTtl: '1 minute',
  executionTimeout: '5 seconds',
  retry: {
    count: 10,
    delay: '200ms',
    jitter: '100ms'
  }
}

type TypedDecorator = TypedMethodDecorator<'extend', 'target', (...args: NonEmptyArray<any>) => Promise<any>>

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
      Inject(IRequestContextService)(target, 'requestContextService')
    },
    wrapPipeline(async (args, next, ctx) => {
      const { cacheService, distributedLockService, requestContextService } = ctx.instance as {
        cacheService: ICacheService
        distributedLockService: IDistributedLockService
        requestContextService: IRequestContextService
      }

      const key =
        requestContextService.current.idempotencyKey ?? hash((args[idempotentOptions.keyIndex] ?? '') as NotUndefined)
      const requestId = `${kebabCase(ctx.class.name)}:${key}`
      const cachedResultKey = CacheKey<unknown>(`${requestId}:result`)

      try {
        let cachedResult = await cacheService.keyValueGet(cachedResultKey)

        if (cachedResult) {
          return of(cachedResult)
        }

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
                  await cacheService.keyValueSet(cachedResultKey, result, idempotentOptions.cacheTtl)
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

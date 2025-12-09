import { throwError, wrapPipeline } from '@internal/common'

import { applyDecorators, Inject } from '@nestjs/common'
import hash, { type NotUndefined } from 'object-hash'
import { defer, delayWhen, mergeMap, of } from 'rxjs'
import { kebabCase } from 'string-ts'

import { AcquireOptions, IDistributedLockService } from './distributed-lock.interface'

type TypedDecorator<TInput extends any[]> = TypedMethodDecorator<
  'extend',
  'decorator',
  (...args: TInput) => Promise<any>
>

export const UseMutex = <TInput extends any[]>(
  keyFactory: (...args: TInput) => unknown,
  options?: Partial<AcquireOptions>
): TypedDecorator<TInput> => {
  return applyDecorators(
    (target: object) => {
      Inject(IDistributedLockService)(target, 'distributedLockService')
    },
    wrapPipeline<TInput>(async (args, next, ctx) => {
      const { distributedLockService } = ctx.instance as { distributedLockService: IDistributedLockService }

      const key = keyFactory(...args)
      const lockKey = `${kebabCase(ctx.class.name)}:${typeof key === 'string' ? key : hash(key as NotUndefined)}`

      try {
        const isAcquired = await distributedLockService.tryAcquire([lockKey], options)

        if (!isAcquired) {
          return throwError(() => new Error('Failed to acquire lock'))
        }

        return next.handle().pipe(
          mergeMap((result) =>
            of(result).pipe(
              delayWhen(() =>
                defer(async () => {
                  await distributedLockService.release([lockKey])
                })
              )
            )
          )
        )
      } catch (error) {
        await distributedLockService.release([lockKey])
        return throwError(() => error)
      }
    })
  ) as TypedDecorator<TInput>
}

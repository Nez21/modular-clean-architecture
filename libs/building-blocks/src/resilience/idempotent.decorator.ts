// import { applyDecorators } from '@nestjs/common'
// import { Inject } from '@nestjs/common/decorators'
// import { Duration } from 'luxon'
// import hash, { type NotUndefined } from 'object-hash'

// import { Mutex } from 'redis-semaphore'
// import { defer, delayWhen, mergeMap, of, throwError } from 'rxjs'

// import { kebabCase } from 'string-ts'

// import { CacheKey, ICacheService, ValkeyClient } from '#/cache'
// import { IRequestContextService } from '#/request-context'

// import { wrapPipeline } from './resilience.utils'

// export type IdempotentOptions =
//   | {
//       key: 'idempotentKey'
//       cacheTTL: Duration
//       executionTimeout: Duration
//     }
//   | {
//       key: 'requestHash'
//       keyIndex: number
//       cacheTTL: Duration
//       executionTimeout: Duration
//     }

// const defaultOptions: IdempotentOptions = {
//   key: 'requestHash',
//   keyIndex: 0,
//   cacheTTL: Duration.fromObject({ minutes: 1 }),
//   executionTimeout: Duration.fromObject({ seconds: 5 })
// }

// type TypedDecorator = TypedMethodDecorator<'inherit', 'target', (...args: NonEmptyArray<any>) => Promise<any>>

// export const UseIdempotent = (options?: Partial<IdempotentOptions>): TypedDecorator => {
//   const idempotentOptions = { ...defaultOptions, ...options }

//   return applyDecorators(
//     (target: object) => {
//       Inject(ICacheService)(target, 'cacheService')
//       Inject(ValkeyClient)(target, 'valkeyClient')
//       idempotentOptions.key === 'idempotentKey' && Inject(IRequestContextService)(target, 'requestContextService')
//     },
//     wrapPipeline(async (args, next, ctx) => {
//       const { cacheService, valkeyClient, requestContextService } = ctx.instance as {
//         cacheService: ICacheService
//         valkeyClient: ValkeyClient
//         requestContextService: IRequestContextService
//       }

//       const requestId =
//         idempotentOptions.key === 'idempotentKey'
//           ? `${kebabCase(ctx.class.name)}:${requestContextService.idempotentKey}`
//           : `${kebabCase(ctx.class.name)}:${hash((args[idempotentOptions.keyIndex] ?? '') as NotUndefined)}`
//       const cachedResultKey = CacheKey<unknown>(`${requestId}:result`)

//       let cachedResult = await cacheService.keyValueGet(cachedResultKey)

//       if (cachedResult) {
//         return of(cachedResult)
//       }

//       const mutex = new Mutex(redisClient, `${requestId}:lock`, {
//         acquireTimeout: idempotentOptions.executionTimeout.as('milliseconds'),
//         lockTimeout: idempotentOptions.executionTimeout.as('milliseconds')
//       })

//       try {
//         await mutex.acquire()
//         cachedResult = await cacheService.keyValueGet(cachedResultKey)

//         if (cachedResult) {
//           await mutex.release()
//           return of(cachedResult)
//         }

//         return next.handle().pipe(
//           mergeMap((result) =>
//             of(result).pipe(
//               delayWhen(() =>
//                 defer(async () => {
//                   await cacheService.keyValueSet(cachedResultKey, result, idempotentOptions.cacheTTL)
//                   await mutex.release()
//                 })
//               )
//             )
//           )
//         )
//       } catch (error) {
//         await mutex.release()
//         return throwError(() => error)
//       }
//     })
//   ) as TypedDecorator
// }

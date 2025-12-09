import { wrapPipeline } from '@internal/common'

import ms from 'ms'
import { retry, timer } from 'rxjs'

export interface RetryOptions {
  count: number
  baseDelay: ms.StringValue
}

const defaultOptions: RetryOptions = {
  count: 3,
  baseDelay: '1 second'
}

type TypedDecorator = TypedMethodDecorator<'extend', 'target', (...args: any[]) => Promise<any>>

export const UseRetry = (options?: Partial<RetryOptions>): TypedDecorator => {
  const retryOptions = { ...defaultOptions, ...options }

  return wrapPipeline((_, next) =>
    next.handle().pipe(
      retry({
        count: retryOptions.count,
        resetOnSuccess: true,
        delay: (_error, times) => timer(2 ** (times - 1) * ms(retryOptions.baseDelay))
      })
    )
  ) as TypedDecorator
}

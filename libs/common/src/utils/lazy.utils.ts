import { isPromise } from './type.utils'

const instance = Symbol('instance')

export class Lazy<T> {
  [instance]?: Awaited<T>

  constructor(private readonly fn: () => T) {}

  resolve(): T {
    if (this[instance]) {
      return this[instance]
    }

    const deferred = this.fn()
    const returnCallback = (value: Awaited<T>): Awaited<T> => {
      this[instance] = value
      return value
    }

    if (isPromise(deferred)) {
      return deferred.then((value) => returnCallback(value as Awaited<T>)) as T
    }

    return returnCallback(deferred as Awaited<T>)
  }

  static async resolve<T>(value: T | Lazy<T | Promise<T>>): Promise<T> {
    return isLazy(value) ? await value.resolve() : value
  }
}

export const isLazy = (value: unknown): value is Lazy<unknown> => typeof value == 'object' && value instanceof Lazy

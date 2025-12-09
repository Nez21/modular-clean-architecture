export const isPlainObject = (value: unknown): value is AnyObject =>
  !!value && typeof value === 'object' && value.constructor === Object

export const isPromise = <T>(value: T | Promise<T>): value is Promise<T> =>
  !!value && typeof value === 'object' && (value instanceof Promise || 'then' in value)

export const isNil = (value: unknown): value is null | undefined => value === null || value === undefined

export const isNotNil = <T>(value: T | null | undefined): value is T => !isNil(value)

export function assertIsNotNil<T>(value: T | null | undefined, error = new Error('Value is nil')): asserts value is T {
  if (isNil(value)) {
    throw error
  }

  if (isPromise(value)) {
    throw new Error('Value is a promise')
  }
}

/* eslint-disable @typescript-eslint/no-dynamic-delete */

export type ReadonlyDate = Omit<Date, `set${string}`>

export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends Function
    ? T
    : T extends object
      ? T extends Date
        ? ReadonlyDate
        : { readonly [P in keyof T]: DeepReadonly<T[P]> }
      : T

export const deepFreeze = <T extends object>(obj: T): DeepReadonly<T> => {
  const propNames = Object.getOwnPropertyNames(obj)

  for (const name of propNames) {
    const value = obj[name as keyof typeof obj]

    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value as object)
    }
  }

  return Object.freeze(obj) as DeepReadonly<T>
}

export const removeCircular = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object') return obj

  obj = structuredClone(obj)
  const seen = new WeakMap()
  const recurse = (obj: object) => {
    seen.set(obj, true)

    for (const [key, value] of Object.entries(obj)) {
      if (!value || typeof value !== 'object' || [Date, RegExp, BigInt].some((t) => value instanceof t)) continue
      if (seen.has(value as object)) delete obj[key]
      else recurse(value as object)
    }
  }

  recurse(obj as object)

  return obj
}

import { core as zCore } from 'zod/v4'

export type ReadonlyDate = Omit<Date, `set${string}`>

export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends Function
    ? T
    : T extends Date
      ? ReadonlyDate
      : T extends object
        ? {
            readonly [P in keyof T]: T[P] extends { [zCore.$brand]: infer U }
              ? T[P] extends infer R & { [zCore.$brand]: U }
                ? Branded<DeepReadonly<R>, U extends object ? (keyof U extends string ? keyof U : never) : never>
                : DeepReadonly<T[P]>
              : DeepReadonly<T[P]>
          }
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

export const isEmptyObject = (obj: object): boolean => {
  return Object.keys(obj).length === 0
}

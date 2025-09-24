import { core as zCore } from 'zod/v4'

type TypeOfBrand<T> = T extends { [zCore.$brand]: infer U } ? (T extends infer R & { [zCore.$brand]: U } ? R : T) : T

export type ReadonlyDate = Omit<Date, `set${string}`>

export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends Function
    ? T
    : T extends Date
      ? ReadonlyDate
      : T extends object
        ? { readonly [P in keyof T]: DeepReadonly<TypeOfBrand<T[P]>> }
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

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

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

// export const deepMerge = <T extends object[]>(
//   input: T,
//   options: { overrideNullUndefined: boolean; excludeClasses: Class[] } = {
//     overrideNullUndefined: true,
//     excludeClasses: [Date, RegExp]
//   }
// ): UnionToIntersection<T[number]> => {
//   const { overrideNullUndefined, excludeClasses } = options

//   if (input.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
//     throw new Error('All items must be objects')
//   }

//   const shouldExclude = (obj: any): boolean => {
//     return excludeClasses.some((ClassConstructor) => obj instanceof ClassConstructor)
//   }

//   if (input.some((item) => shouldExclude(item))) {
//     return (overrideNullUndefined ? input[0] : input.find(Boolean)) as UnionToIntersection<T[number]>
//   }

//   const result = { ...input[0] } as UnionToIntersection<T[number]>

//   for (const key in obj2) {
//     if (Object.hasOwn(obj2, key)) {
//       const obj1Value = (obj1 as any)[key]
//       const obj2Value = (obj2 as any)[key]

//       if (
//         obj1Value != null &&
//         obj2Value != null &&
//         typeof obj1Value === 'object' &&
//         typeof obj2Value === 'object' &&
//         !Array.isArray(obj1Value) &&
//         !Array.isArray(obj2Value) &&
//         !shouldExclude(obj1Value) &&
//         !shouldExclude(obj2Value)
//       ) {
//         result[key as keyof (T1 & T2)] = deepMerge(obj1Value, obj2Value, excludeClasses) as any
//       } else {
//         result[key as keyof (T1 & T2)] = obj2Value as any
//       }
//     }
//   }

//   return result
// }

/** biome-ignore-all lint/correctness/noUnusedVariables: False positive */
/** biome-ignore-all lint/suspicious/noTsIgnore: Type hack */
type AnyObject = Record<string | symbol, any>

type Class<TInstance extends object = object, TArgs extends any[] = any[]> = new (...args: TArgs) => TInstance

type AbstractClass<TInstance extends object = object, TArgs extends any[] = any[]> = abstract new (
  ...args: TArgs
) => TInstance

type AnyClass<TInstance extends object = object> = Function & { prototype: TInstance }

type Instance<T> = T & { constructor: Class<T> }

type IsUnion<T, U extends T = T> = T extends unknown ? ([U] extends [T] ? false : true) : false

type IfEquals<T, U, Y = unknown, N = never> = (<G>() => G extends T ? true : false) extends <G>() => G extends U
  ? true
  : false
  ? Y
  : N

type Coalesce<T, U> = IfEquals<T, never, U, T>

// @ts-ignore
type GetPropertyType<TTarget, TKey extends string | symbol> = TTarget[TKey]

type GetParameterType<
  TTarget,
  TKey extends string | symbol | undefined,
  TIndex extends number | undefined
> = TKey extends undefined
  ? TIndex extends undefined
    ? never
    : // @ts-ignore
      ConstructorParameters<TTarget>[TIndex]
  : TIndex extends undefined
    ? // @ts-ignore
      TTarget[TKey]
    : // @ts-ignore
      Parameters<TTarget[TKey]>[TIndex]

type IsTypes<T, TTypes, Y, N> = IfEquals<TTypes extends TTypes ? (T extends TTypes ? true : never) : never, true, Y, N>

type ObjectStringKeys<TObj, TTypes> = {
  [K in keyof TObj]: K extends string ? IsTypes<TObj[K], TTypes, K, never> : never
}[keyof TObj]

type ClassProperties<T> = {
  [K in keyof T as K extends string ? (T[K] extends Function ? never : K) : never]: T[K]
}

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never

type Element<T> = T extends (infer R)[] ? R : T

type AnyFunction = (...args: any[]) => any

type IsBothArrayOrNeither<T1, T2> = T1 extends { length: number }
  ? T2 extends { length: number }
    ? true
    : false
  : T1 extends { length: never }
    ? T2 extends { length: never }
      ? true
      : false
    : true

type NonEmptyArray<T> = [T, ...T[]]

type CustomInstanceType<T> = T extends Class<infer R>[] ? R[] : T extends Class<infer R> ? R : never

type Action<T> = (() => Promise<T>) | (() => T)

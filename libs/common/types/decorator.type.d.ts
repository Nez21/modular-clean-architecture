type ErrorDisplayType = 'target' | 'decorator'
type MatchType = 'exact' | 'inherit'

type TypeAssertion = {
  matchType: MatchType
  errorDisplayType: ErrorDisplayType
  target: string
  targetType: unknown
  decoratorType: unknown
  returnType: unknown
}

type IfMatchType<TTarget, TBase, T extends MatchType, Y, N> = T extends 'extract'
  ? IfEquals<TTarget, TBase, Y, N>
  : T extends 'inherit'
    ? TTarget extends TBase
      ? Y
      : N
    : never

type AssertType<T extends TypeAssertion> = IfMatchType<
  T['targetType'],
  T['decoratorType'],
  T['matchType'],
  T['returnType'],
  T['errorDisplayType'] extends 'decorator'
    ? ErrorMessage<`Type of decorator is not assignable to type of ${T['target']}.`>
    : ErrorMessage<`Type of ${T['target']} is not assignable to type of decorator.`>
>

type TypedParameterDecorator<
  TMatchType extends MatchType,
  TErrorDisplayType extends ErrorDisplayType,
  TDecoratorType
> = <TTarget extends object, TKey extends string | symbol | undefined, TIndex extends number>(
  target: TTarget,
  propertyKey: TKey,
  parameterIndex: TIndex
) => AssertType<{
  matchType: TMatchType
  errorDisplayType: TErrorDisplayType
  target: TKey extends undefined
    ? `parameters[${TIndex}] in the class constructor`
    : `parameters[${TIndex}] in the method ${TKey extends string ? TKey : '[Symbol()]'}`
  targetType: GetParameterType<TTarget, TKey, TIndex>
  decoratorType: TDecoratorType
  returnType: void
}>

type TypedPropertyDecorator<
  TMatchType extends MatchType,
  TErrorDisplayType extends ErrorDisplayType,
  TDecoratorType
> = <TTarget extends object, TKey extends string | symbol>(
  target: TTarget,
  propertyKey: TKey
) => AssertType<{
  matchType: TMatchType
  errorDisplayType: TErrorDisplayType
  target: TKey extends string ? `${TKey} in the class` : '[Symbol()] in the class'
  targetType: GetPropertyType<TTarget, TKey>
  decoratorType: TDecoratorType
  returnType: void
}>

type TypedPropertyOrParameterDecorator<
  TMatchType extends MatchType,
  TErrorDisplayType extends ErrorDisplayType,
  TDecoratorType
> = <TTarget extends object, TKey extends string | symbol | undefined, TIndex extends number | undefined>(
  target: TTarget,
  propertyKey: TKey,
  parameterIndex?: TIndex
) => AssertType<{
  matchType: TMatchType
  errorDisplayType: TErrorDisplayType
  target: TKey extends undefined
    ? IfEquals<TIndex, number | undefined, never, `parameters[${TIndex}] in the class constructor`>
    : IfEquals<
        TIndex,
        number | undefined,
        `property ${TKey extends string ? TKey : '[Symbol()]'} in the class`,
        `parameters[${TIndex}] in the ${TKey extends string ? TKey : 'method [Symbol()]'}`
      >
  targetType: GetParameterType<TTarget, TKey, typeof parameterIndex>
  decoratorType: TDecoratorType
  returnType: void
}>

type TypedMethodDecorator<
  TMatchType extends MatchType,
  TErrorDisplayType extends ErrorDisplayType,
  TDecoratorType extends (...args: any[]) => any
> = <TTarget extends object, TKey extends string | symbol>(
  target: TTarget,
  propertyKey: TKey,
  descriptor: TypedPropertyDescriptor<GetPropertyType<TTarget, TKey>>
) =>
  | AssertType<{
      matchType: TMatchType
      errorDisplayType: TErrorDisplayType
      target: TKey extends string
        ? `parameters of method ${TKey} in the class`
        : 'parameters of method [Symbol()] in the class'
      targetType: Parameters<GetPropertyType<TTarget, TKey>>
      decoratorType: Parameters<TDecoratorType>
      returnType: TypedPropertyDescriptor<GetPropertyType<TTarget, TKey>> | void
    }>
  | AssertType<{
      matchType: TMatchType
      errorDisplayType: TErrorDisplayType
      target: TKey extends string
        ? `return type of method ${TKey} in the class`
        : 'return type of method [Symbol()] in the class'
      targetType: ReturnType<GetPropertyType<TTarget, TKey>>
      decoratorType: ReturnType<TDecoratorType>
      returnType: TypedPropertyDescriptor<GetPropertyType<TTarget, TKey>> | void
    }>

type TypedClassDecorator<TMatchType extends MatchType, TErrorDisplayType extends ErrorDisplayType, TDecoratorType> = <
  TTarget extends object
>(
  target: Class<TTarget>
) => AssertType<{
  matchType: TMatchType
  errorDisplayType: TErrorDisplayType
  target: 'class'
  targetType: TTarget
  decoratorType: TDecoratorType
  returnType: InstanceType<TTarget> | void
}>

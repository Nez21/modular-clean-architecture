import '@nestjs/common'

declare module '@nestjs/common' {
  export type InjectionToken<TType> = (string | symbol | Function) & { __type: TType }

  export const Inject: <TType>(
    token: IfEquals<
      TType,
      unknown,
      ErrorMessage<'Only injection token or class type is allowed'>,
      InjectionToken<TType> | (TType extends object ? Class<TType> : never)
    >
  ) => IfEquals<TType, unknown, (...args: any[]) => void, TypedPropertyOrParameterDecorator<'exact', 'target', TType>>
}

import type { ExistingProvider, InjectionToken, Provider, Scope } from '@nestjs/common'

/**
 * Maps an array of injection tokens to their corresponding types
 *
 * @typeParam T - An array of injection tokens
 * @returns An object type with token types mapped to their positions
 */
export type InjectedInstances<T extends (InjectionToken<any> | Class)[]> = {
  [K in keyof T]: T[K] extends Class<infer R> ? R : T[K] extends InjectionToken<any> ? T[K]['__type'] : never
}

/**
 * Provider configuration for class-based providers with type checking
 *
 * @typeParam TType - The type that this provider will produce
 */
export interface TypedClassProvider<TType> {
  /** The class to instantiate and provide */
  useClass: TType extends object ? Class<TType> : ErrorMessage<'Only class type is allowed'>
  /** Optional scope of the provider */
  scope?: Scope
  /** Whether the provider is durable */
  durable?: boolean
}

/**
 * Provider configuration for value-based providers with type checking
 *
 * @typeParam TType - The type that this provider will produce
 */
export interface TypedValueProvider<TType> {
  /** The value to provide */
  useValue: TType
  /** Optional scope of the provider */
  scope?: Scope
  /** Whether the provider is durable */
  durable?: boolean
}

/**
 * Provider configuration for factory-based providers with type checking
 *
 * @typeParam TType - The type that this provider will produce
 * @typeParam TInjects - Array of injection tokens for factory dependencies
 */
export interface TypedFactoryProvider<TType, TInjects extends (InjectionToken<any> | Class)[]> {
  /** Factory function that produces the provided value */
  useFactory: NoInfer<(...args: InjectedInstances<TInjects>) => TType | Promise<TType>>
  /** Tokens to inject into the factory function */
  inject?: Readonly<TInjects>
  /** Optional scope of the provider */
  scope?: Scope
  /** Whether the provider is durable */
  durable?: boolean
}

export type TypedProvider<TType, TInjects extends (InjectionToken<any> | Class)[]> =
  | TypedClassProvider<TType>
  | TypedValueProvider<TType>
  | TypedFactoryProvider<TType, TInjects>
  | Omit<ExistingProvider, 'provide'>

/**
 * Function signature for creating strongly-typed providers
 *
 * @typeParam TType - The type that this token will represent
 */
export interface TokenFn<TType> {
  /**
   * Creates a provider for the token
   *
   * @typeParam TInjects - Array of injection tokens for factory dependencies
   * @param input - Provider configuration (class, value, or factory)
   * @returns A NestJS provider configured with the token
   */
  <TInjects extends (InjectionToken<any> | Class)[]>(input: TypedProvider<TType, TInjects>): Provider
}

/**
 * Creates a strongly-typed injection token that can be used in NestJS dependency injection
 *
 * @typeParam TType - The type that this token will represent
 * @param name - The name of the token for debugging purposes
 * @returns A token function that can be used to create providers
 *
 * @example
 * // Create a token for a string configuration
 * const API_URL = Token<string>('API_URL');
 *
 * // Use the token to create a provider
 * const apiUrlProvider = API_URL({ useValue: 'https://api.example.com' });
 *
 * // Inject the token in a service
 * ＠Injectable()
 * class ApiService {
 *   constructor(@Inject(API_URL) private readonly apiUrl: string) {}
 * }
 */
export const Token = <TType>(
  name: IfEquals<
    TType,
    any,
    ErrorMessage<'Type should be specified'>,
    IfEquals<
      TType,
      unknown,
      ErrorMessage<'Type should be specified'>,
      IfEquals<TType, never, ErrorMessage<'Type should be specified'>, string>
    >
  >
) => {
  const fn: TokenFn<TType> = (input) => ({ provide: fn, ...input }) as Provider

  Object.defineProperty(fn, 'name', { value: name })

  return fn as TokenFn<TType> & { __type: TType }
}

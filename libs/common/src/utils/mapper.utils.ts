import type { CamelCase, PascalCase, SnakeCase, TitleCase } from 'string-ts'
import { camelCase, pascalCase, snakeCase, titleCase } from 'string-ts'
import type { core as zCore } from 'zod'
import { z } from 'zod'

export type NameConvention = 'camelCase' | 'snakeCase' | 'pascalCase' | 'titleCase' | 'none'

const stringTransformers = {
  camelCase,
  snakeCase,
  pascalCase,
  titleCase,
  none: <T extends string>(str: T): T => str
} as const satisfies Record<NameConvention, (str: string) => string>

export type TransformString<T extends string, TNameConvention extends NameConvention> = TNameConvention extends 'none'
  ? T
  : TNameConvention extends 'camelCase'
    ? CamelCase<T>
    : TNameConvention extends 'snakeCase'
      ? SnakeCase<T>
      : TNameConvention extends 'pascalCase'
        ? PascalCase<T>
        : TNameConvention extends 'titleCase'
          ? TitleCase<T>
          : never

export class MapperError extends z.ZodError {
  constructor(
    private readonly baseMessage: string,
    issues: zCore.$ZodIssue[]
  ) {
    super(issues)
  }

  override get message(): string {
    return `${this.baseMessage}\n${super.message}`
  }
}

type GetPropertySchema<TSchema extends z.ZodObject<z.ZodRawShape>, TKey> = TKey extends keyof TSchema['shape']
  ? TSchema['shape'][TKey] extends z.ZodObject<z.ZodRawShape>
    ? TSchema['shape'][TKey]
    : TSchema['shape'][TKey] extends z.ZodArray<z.ZodObject<z.ZodRawShape>>
      ? TSchema['shape'][TKey]['element']
      : never
  : never

type MapFunction<TSourceSchema extends z.ZodObject<z.ZodRawShape>, TDestSchema extends z.ZodObject<z.ZodRawShape>> = <
  T
>(
  source: T
) => T extends z.input<TSourceSchema>[] ? z.output<TDestSchema>[] : z.output<TDestSchema>

export interface MapperBuilder<
  TSourceSchema extends z.ZodObject<z.ZodRawShape>,
  TDestSchema extends z.ZodObject<z.ZodRawShape>,
  TNameConvention extends NameConvention,
  TMapped = {
    [K in keyof z.output<TSourceSchema> as K extends string
      ? K | TransformString<K, TNameConvention>
      : never]: z.output<TSourceSchema>[K]
  }
> {
  forMember<TDestKey extends keyof z.input<TDestSchema>, TSourceValue extends z.input<TDestSchema>[TDestKey]>(
    destSelector: (dest: { [K in keyof z.input<TDestSchema>]-?: K }) => TDestKey,
    sourceValueSelector: (source: z.output<TSourceSchema>) => TSourceValue
  ): MapperBuilder<TSourceSchema, TDestSchema, TNameConvention, TMapped | Record<TDestKey, TSourceValue>>

  forNestedMember<
    TSourceKey extends keyof z.output<TSourceSchema>,
    TDestKey extends keyof z.input<TDestSchema>,
    TMapper extends (
      mapper: MapperBuilder<
        GetPropertySchema<TSourceSchema, TSourceKey>,
        GetPropertySchema<TDestSchema, TDestKey>,
        TNameConvention
      >
    ) => (source: Element<z.output<TSourceSchema>[TSourceKey]>) => Element<z.input<TDestSchema>[TDestKey]>
  >(
    destSelector: (dest: { [K in keyof z.input<TDestSchema>]-?: K }) => TDestKey,
    sourceSelector: (source: { [K in keyof z.output<TSourceSchema>]-?: K }) => TSourceKey,
    mapper: IsBothArrayOrNeither<z.input<TDestSchema>[TDestKey], z.output<TSourceSchema>[TSourceKey]> extends true
      ? TMapper
      : () => ErrorMessage<'Source and destination schemas are not compatible'>
  ): MapperBuilder<
    TSourceSchema,
    TDestSchema,
    TNameConvention,
    TMapped | Record<TDestKey, z.input<TDestSchema>[TDestKey]>
  >

  build: UnionToIntersection<TMapped> extends z.input<TDestSchema>
    ? () => MapFunction<TSourceSchema, TDestSchema>
    : { error: ErrorMessage<'Source and destination schemas are not compatible'> }
}

const createProxy = <T>() => {
  const property: string[] = []
  const proxy = new Proxy({} as { [K in keyof T]-?: K }, {
    get(_, prop) {
      if (typeof prop === 'symbol') {
        throw new TypeError('Symbol keys are not supported')
      }

      property.push(prop)
      return prop
    }
  })

  return { property, proxy }
}

const getPropertySchema = (schema: z.ZodObject, key: string) => {
  let propSchema = schema.shape[key]
  propSchema = propSchema instanceof z.ZodArray ? propSchema.element : propSchema

  if (!(propSchema instanceof z.ZodObject)) {
    throw new TypeError(`Property ${key} is not an object`)
  }

  return propSchema
}

export function createMapper<
  TSourceSchema extends z.ZodObject<z.ZodRawShape>,
  TDestSchema extends z.ZodObject<z.ZodRawShape>,
  TNameConvention extends NameConvention = 'none'
>(
  sourceSchema: TSourceSchema,
  destSchema: TDestSchema,
  nameConvention: TNameConvention = 'none' as TNameConvention
): MapperBuilder<TSourceSchema, TDestSchema, TNameConvention> {
  type TSource = z.output<TSourceSchema>
  type TDest = z.input<TDestSchema>

  const memberMappings: (
    | { destSelector: AnyFunction; sourceValueSelector: AnyFunction }
    | { destSelector: AnyFunction; sourceSelector: AnyFunction; mapper: AnyFunction }
  )[] = []

  const api = {
    forMember(destSelector: AnyFunction, sourceValueSelector: AnyFunction) {
      memberMappings.push({ destSelector, sourceValueSelector })

      return api
    },

    forNestedMember(destSelector: AnyFunction, sourceSelector: AnyFunction, mapper: AnyFunction) {
      memberMappings.push({ destSelector, sourceSelector, mapper })

      return api
    },

    build() {
      const transformer = stringTransformers[nameConvention]
      const destShape = destSchema.shape
      const sourceShape = sourceSchema.shape
      const destKeys = Object.keys(destShape)
      const sourceKeys = Object.keys(sourceShape)
      const destProxy = createProxy<TDest>()
      const sourceProxy = createProxy<TSource>()
      const processedMappings: (
        | { destKey: string; sourceValueSelector: AnyFunction }
        | { destKey: string; sourceKey?: string; mapper: AnyFunction }
      )[] = []

      for (const mapping of memberMappings) {
        destProxy.property.length = 0
        sourceProxy.property.length = 0
        mapping.destSelector(destProxy.proxy)

        if ('sourceValueSelector' in mapping) {
          processedMappings.push({
            destKey: destProxy.property[0],
            sourceValueSelector: mapping.sourceValueSelector
          })
        } else {
          mapping.sourceSelector(sourceProxy.proxy)

          processedMappings.push({
            destKey: destProxy.property[0],
            sourceKey: sourceProxy.property[0],
            mapper: mapping.mapper(
              createMapper(
                getPropertySchema(sourceSchema, sourceProxy.property[0]),
                getPropertySchema(destSchema, destProxy.property[0]),
                nameConvention
              )
            )
          })
        }
      }

      const keyMap: { sourceKey: string; destKey: string }[] = []

      for (const destKey of destKeys) {
        const sourceKey = sourceKeys.find((key) => {
          return key === destKey || transformer(key) === destKey
        })

        if (sourceKey) {
          keyMap.push({ sourceKey, destKey })
        }
      }

      let evalScript = `const result = {}\n`
      const mappers: AnyFunction[] = []
      const sourceValueSelectors: AnyFunction[] = []

      for (const { destKey, sourceKey } of keyMap) {
        evalScript += `result['${destKey}'] = sourceWithDefaults['${sourceKey}']\n`
      }

      for (const processedMapping of processedMappings) {
        if ('sourceValueSelector' in processedMapping) {
          evalScript += `result['${processedMapping.destKey}'] = sourceValueSelectors[${String(sourceValueSelectors.length)}](sourceWithDefaults)\n`
          sourceValueSelectors.push(processedMapping.sourceValueSelector)
        } else {
          evalScript += `result['${processedMapping.destKey}'] = mappers[${String(mappers.length)}](sourceWithDefaults${processedMapping.sourceKey ? `['${processedMapping.sourceKey}']` : ''}, true)\n`
          mappers.push(processedMapping.mapper)
        }
      }

      evalScript += `return result`

      const optimizedMapMembers = new Function('sourceWithDefaults', 'sourceValueSelectors', 'mappers', evalScript) as (
        sourceWithDefaults: TSource,
        sourceValueSelectors: AnyFunction[],
        mappers: AnyFunction[]
      ) => Record<string, unknown>

      const mapper = (source: TSource, skipValidation?: boolean) => {
        const parsedSource = skipValidation
          ? ({ success: true, data: source } as const)
          : sourceSchema.safeParse(source)

        if (!parsedSource.success) {
          throw new MapperError('Source schema validation failed', parsedSource.error.issues)
        }

        const result = optimizedMapMembers(parsedSource.data, sourceValueSelectors, mappers)

        const { success, data, error } = skipValidation
          ? ({ success: true, data: result } as const)
          : destSchema.safeParse(result)

        if (!success) {
          throw new MapperError('Source and destination schemas are not compatible', error.issues)
        }

        return data as TDest
      }

      return (sources: TSource | TSource[], skipValidation?: boolean): TDest | TDest[] => {
        return Array.isArray(sources)
          ? sources.map((item) => mapper(item, skipValidation))
          : mapper(sources, skipValidation)
      }
    }
  }

  return api as MapperBuilder<TSourceSchema, TDestSchema, TNameConvention>
}

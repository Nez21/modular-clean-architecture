import type { CustomDecorator } from '@nestjs/common'

type MetadataType = string | number | object | boolean | undefined

export type MetadataKey<TType extends MetadataType> = symbol & {
  __type: TType
}

export const MetadataKey = <TType extends MetadataType>(nameOrSymbol: string | symbol) =>
  (typeof nameOrSymbol === 'symbol' ? nameOrSymbol : Symbol(nameOrSymbol)) as IfEquals<
    TType,
    MetadataType,
    never,
    MetadataKey<TType>
  >

export const SetTypedMetadata = <K extends MetadataKey<any>>(
  metadataKey: K,
  value: K['__type'],
  appendArray?: K['__type'] extends any[] ? boolean : never
): CustomDecorator<K> => {
  const decoratorFactory = (target: object, _key?: any, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      if (appendArray && Array.isArray(value)) {
        value = [...(getTypedMetadata(metadataKey, target) ?? []), ...value]
      }

      Reflect.defineMetadata(metadataKey, value, descriptor.value as object)

      return descriptor
    }

    Reflect.defineMetadata(metadataKey, value, target)

    return target
  }

  decoratorFactory.KEY = metadataKey

  return decoratorFactory as CustomDecorator<K>
}

export const getTypedMetadata = <K extends MetadataKey<any>, T extends boolean = true>(
  key: K,
  target: object,
  throwIfNotFound: T = true as T
): IfEquals<T, true, K['__type'], K['__type'] | undefined> => {
  const value = Reflect.getMetadata(key, target) as unknown

  if (!value && throwIfNotFound) {
    throw new Error(`Metadata ${key.toString()} not found`)
  }

  return value as IfEquals<T, true, K['__type'], K['__type'] | undefined>
}

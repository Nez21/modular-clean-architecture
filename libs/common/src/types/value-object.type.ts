import { randomUUID, UUID } from 'node:crypto'

import { z } from 'zod'

import { DeepReadonly, deepFreeze, diff, getTypedMetadata, MetadataKey, SetTypedMetadata } from '#/utils'

const Schema = Symbol('Schema')
const MetadataKeys = {
  TypeId: MetadataKey<UUID>('TypeId'),
  IsValueObject: MetadataKey<boolean>('IsValueObject'),
  Schema: MetadataKey<z.ZodObject>(Schema)
} as const

export interface IValueObject<TSchema extends z.ZodObject = z.ZodObject<Record<string, z.ZodType<any>>>> {
  [Schema]?: TSchema

  validate(): void
  validateAsync(): Promise<void>
  equals<T extends IValueObject>(this: T, other: T): boolean
}

export type ValueObjectSchemaOf<T extends IValueObject> = NonNullable<T[typeof Schema]>
export type ValueObjectType<TSchema extends z.ZodObject> = IValueObject<TSchema> & DeepReadonly<z.output<TSchema>>

export function ValueObject<TSchema extends z.ZodObject>(schema: TSchema) {
  const typeId = randomUUID()

  @SetTypedMetadata(MetadataKeys.TypeId, typeId)
  @SetTypedMetadata(MetadataKeys.IsValueObject, true)
  @SetTypedMetadata(MetadataKeys.Schema, schema)
  abstract class BaseValueObject implements IValueObject<TSchema> {
    protected constructor() {}

    static create<T extends IValueObject>(
      this: AnyClass<T>,
      obj: z.input<ValueObjectSchemaOf<T>>
    ): T & DeepReadonly<z.output<ValueObjectSchemaOf<T>>> {
      // @ts-ignore
      const instance = new this() as T

      return deepFreeze(Object.assign(instance, schema.parse(obj))) as T &
        DeepReadonly<z.output<ValueObjectSchemaOf<T>>>
    }

    static get $typeId(): UUID {
      return typeId
    }

    static get $schema(): TSchema {
      return schema
    }

    validate(): void {
      schema.parse(this)
    }

    async validateAsync(): Promise<void> {
      await schema.parseAsync(this)
    }

    equals<T extends IValueObject>(
      this: T & z.output<ValueObjectSchemaOf<T>>,
      other: T & z.output<ValueObjectSchemaOf<T>>
    ): boolean {
      if (this === other) return true
      if (this.constructor !== other.constructor) return false

      return diff(this, other).length === 0
    }
  }

  return BaseValueObject as AbstractClass<ValueObjectType<TSchema>> & typeof BaseValueObject
}

export abstract class ValueObjectUtils {
  static create<T extends IValueObject>(
    cls: AnyClass<T>,
    obj: z.input<ValueObjectSchemaOf<T>>
  ): T & DeepReadonly<z.output<ValueObjectSchemaOf<T>>> {
    // @ts-ignore
    const instance = new cls() as T

    return deepFreeze(Object.assign(instance, ValueObjectUtils.getSchema(cls).parse(obj))) as T &
      DeepReadonly<z.output<ValueObjectSchemaOf<T>>>
  }

  static isValueObject(instance: IValueObject | object): instance is Instance<IValueObject> {
    return (
      typeof instance === 'object' &&
      instance.constructor !== Object &&
      !!getTypedMetadata(MetadataKeys.IsValueObject, instance.constructor, false)
    )
  }

  static assert(instance: IValueObject | object): asserts instance is Instance<IValueObject> {
    if (!ValueObjectUtils.isValueObject(instance)) {
      throw new Error('Instance is not constructed with ValueObject')
    }
  }

  static getTypeId(cls: AnyClass<IValueObject>): UUID {
    return getTypedMetadata(MetadataKeys.TypeId, cls)
  }

  static getSchema<T extends IValueObject>(cls: AnyClass<T>): ValueObjectSchemaOf<T> {
    return getTypedMetadata(MetadataKeys.Schema, cls)
  }
}

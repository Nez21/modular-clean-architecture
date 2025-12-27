import { randomUUID, UUID } from 'node:crypto'

import { err, ok, Result } from 'neverthrow'
import { z } from 'zod'

import { DeepReadonly, getTypedMetadata, MetadataKey, SetTypedMetadata, serialize } from '#/utils'

const Schema = Symbol('Schema')
const KeyAttributes = Symbol('KeyAttributes')
const MetadataKeys = {
  TypeId: MetadataKey<UUID>('TypeId'),
  IsEntity: MetadataKey<boolean>('IsEntity'),
  Schema: MetadataKey<z.ZodObject>(Schema),
  KeyAttributes: MetadataKey<string[]>(KeyAttributes)
} as const

export interface IEntity<TSchema extends z.ZodObject = z.ZodObject, TKeyAttributes extends string[] = string[]> {
  readonly [Schema]?: TSchema
  readonly [KeyAttributes]?: TKeyAttributes

  validate(): Result<void, z.ZodError>
  equals<T extends IEntity>(this: T, other: T): boolean
  toJSON(): string
}

export type EntitySchemaOf<T extends IEntity> = NonNullable<T[typeof Schema]>
export type KeyAttributesOf<T extends IEntity> = NonNullable<T[typeof KeyAttributes]>
export type KeyOf<T extends IEntity> = {
  [TKey in KeyAttributesOf<T>[number] as TKey extends keyof T ? TKey : never]: TKey extends keyof T ? T[TKey] : never
}
export type EntityType<
  TSchema extends z.ZodObject = z.ZodObject<Record<string, z.ZodType<any>>>,
  TKeyAttributes extends string[] = string[],
  TMixins extends object = object
> = IEntity<TSchema, TKeyAttributes> & DeepReadonly<z.output<TSchema>> & ProtectedData<z.output<TSchema>> & TMixins

export class ProtectedData<T> {
  protected $value!: T
}

export function Entity<
  TSchema extends z.ZodObject,
  TKeyAttributes extends NonEmptyArray<ObjectStringKeys<z.output<TSchema>, boolean | Date | number | string>>,
  TMixins extends object
>(schema: TSchema, keyAttributes: TKeyAttributes, mixins?: Class<TMixins>[]) {
  if (keyAttributes.length === 0) {
    throw new Error('Entity must have at least one key attribute')
  }

  const typeId = randomUUID()

  @SetTypedMetadata(MetadataKeys.TypeId, typeId)
  @SetTypedMetadata(MetadataKeys.IsEntity, true)
  @SetTypedMetadata(MetadataKeys.Schema, schema)
  @SetTypedMetadata(MetadataKeys.KeyAttributes, keyAttributes)
  abstract class BaseEntity implements IEntity<TSchema> {
    static get $typeId(): UUID {
      return typeId
    }

    static get $schema(): TSchema {
      return schema
    }

    validate(): Result<void, z.ZodError> {
      const result = schema.safeParse(this)

      if (!result.success) return err(result.error)

      Object.assign(this['$value'], result.data)

      return ok()
    }

    equals<T extends IEntity>(this: T, other: T): boolean {
      return keyAttributes.every((key) => (this as Record<string, any>)[key] === (other as Record<string, any>)[key])
    }

    toObject(): z.output<TSchema> {
      return structuredClone(this['$value'])
    }

    toJSON(): string {
      return serialize(this['$value'])
    }
  }

  for (const prop of Object.keys((schema as z.ZodObject).shape as Record<keyof z.output<TSchema>, z.ZodType>)) {
    Object.defineProperty(BaseEntity.prototype, prop, {
      get: function () {
        return this.$value[prop]
      }
    })
  }

  for (const mixin of mixins ?? []) {
    Object.assign(BaseEntity.prototype, mixin.prototype)
  }

  return BaseEntity as AbstractClass<EntityType<TSchema, TKeyAttributes, TMixins>> & typeof BaseEntity
}

export abstract class EntityUtils {
  static create<T extends IEntity>(cls: AnyClass<T>, obj: z.input<EntitySchemaOf<T>>): T {
    // @ts-ignore
    const instance = new cls() as T
    instance['$value'] = EntityUtils.getSchema(cls).parse(obj)

    return instance
  }

  static isEntity(instance: IEntity | object): instance is Instance<IEntity> {
    return (
      typeof instance === 'object' &&
      instance.constructor !== Object &&
      !!getTypedMetadata(MetadataKeys.IsEntity, instance.constructor, false)
    )
  }

  static assert(instance: EntityType | object): asserts instance is Instance<EntityType> {
    if (!EntityUtils.isEntity(instance)) {
      throw new Error('Instance is not constructed with Entity')
    }
  }

  static getTypeId(cls: AnyClass<IEntity>): UUID {
    return getTypedMetadata(MetadataKeys.TypeId, cls)
  }

  static getSchema<T extends IEntity>(cls: AnyClass<T>): EntitySchemaOf<T> {
    return getTypedMetadata(MetadataKeys.Schema, cls)
  }

  static getKeyAttributes<T extends IEntity>(cls: AnyClass<T>): KeyAttributesOf<T> {
    return getTypedMetadata(MetadataKeys.KeyAttributes, cls)
  }
}

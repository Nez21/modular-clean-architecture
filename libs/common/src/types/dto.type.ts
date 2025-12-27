import { randomUUID, UUID } from 'node:crypto'

import { z } from 'zod'

import { getTypedMetadata, MetadataKey, SetTypedMetadata } from '#/utils'

const Schema = Symbol('Schema')
const MetadataKeys = {
  TypeId: MetadataKey<UUID>('TypeId'),
  IsDto: MetadataKey<boolean>('IsDto'),
  Schema: MetadataKey<z.ZodObject>(Schema)
} as const

export interface IDto<TSchema extends z.ZodObject = z.ZodObject<Record<string, z.ZodType<any>>>> {
  [Schema]?: TSchema

  validate(): void
  validateAsync(): Promise<void>
}

export type DtoSchemaOf<T extends IDto> = NonNullable<T[typeof Schema]>

export function Dto<TSchema extends z.ZodObject, TBase extends object>(
  schema: TSchema,
  baseClass?: AbstractClass<TBase>
) {
  if (!baseClass) {
    return Dto(schema, class {})
  }

  const typeId = randomUUID()

  @SetTypedMetadata(MetadataKeys.TypeId, typeId)
  @SetTypedMetadata(MetadataKeys.IsDto, true)
  @SetTypedMetadata(MetadataKeys.Schema, schema)
  abstract class BaseDto extends (baseClass as AbstractClass) implements IDto<TSchema> {
    protected constructor() {
      super()
    }

    static create<T extends IDto>(this: AnyClass<T>, obj: z.input<DtoSchemaOf<T>>): T {
      // @ts-ignore
      const instance = new this() as T

      return Object.assign(instance, schema.parse(obj))
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
  }

  return BaseDto as AbstractClass<IDto<TSchema> & z.output<TSchema> & TBase> & typeof BaseDto
}

export abstract class DtoUtils {
  static create<T extends IDto>(cls: AnyClass<T>, obj: z.input<DtoSchemaOf<T>>): T {
    // @ts-ignore
    const instance = new cls() as T

    return Object.assign(instance, DtoUtils.getSchema(cls).parse(obj))
  }

  static isDto(instance: IDto | object): instance is Instance<IDto> {
    return (
      typeof instance === 'object' &&
      instance.constructor !== Object &&
      !!getTypedMetadata(MetadataKeys.IsDto, instance.constructor, false)
    )
  }

  static assert(instance: IDto | object): asserts instance is Instance<IDto> {
    if (!DtoUtils.isDto(instance)) {
      throw new Error('Instance is not constructed with Dto')
    }
  }

  static getTypeId(cls: AnyClass<IDto>): UUID {
    return getTypedMetadata(MetadataKeys.TypeId, cls)
  }

  static getSchema<T extends IDto>(cls: AnyClass<T>): DtoSchemaOf<T> {
    return getTypedMetadata(MetadataKeys.Schema, cls)
  }
}

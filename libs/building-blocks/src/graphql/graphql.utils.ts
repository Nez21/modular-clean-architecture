/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { NullableList } from '@nestjs/graphql'
import { Field, InputType, ObjectType, registerEnumType } from '@nestjs/graphql'
import type { GraphQLScalarType } from 'graphql'
import { GraphQLBoolean, GraphQLFloat, GraphQLString } from 'graphql'
import {
  GraphQLBigInt,
  GraphQLDateTime,
  GraphQLEmailAddress,
  GraphQLNegativeFloat,
  GraphQLNegativeInt,
  GraphQLNonNegativeFloat,
  GraphQLNonNegativeInt,
  GraphQLNonPositiveFloat,
  GraphQLNonPositiveInt,
  GraphQLPositiveFloat,
  GraphQLPositiveInt,
  GraphQLURL,
  GraphQLUUID
} from 'graphql-scalars'
import z from 'zod'
import { printNode, zodToTs } from 'zod-to-ts'

import { DtoUtils, traversalSchema, type IDto } from '@internal/common'

declare module 'zod' {
  interface ZodMeta {
    graphql?: {
      name?: string | { input: string; output: string }
      type?: GraphQLScalarType
      deprecationReason?: string
    }
  }
}

const printZodSchema = (schema: z.ZodType) => printNode(zodToTs(schema).node)

const getSchemaName = (schema: z.ZodType, type?: 'input' | 'output'): string => {
  const name = schema.getMeta()?.graphql?.name

  if (!name) {
    throw new Error(`Missing dto name. Schema:\n${printZodSchema(schema)}`)
  }

  if (typeof name === 'object') {
    if (!type) throw new Error(`Enum only have one name. Enum:\n${printZodSchema(schema)}`)
    if (!name[type]) throw new Error(`Missing ${type} name. Schema:\n${printZodSchema(schema)}`)

    return name[type]
  }

  return name
}

const cachedGqlTypes = new Map<string, object>()

const registerZodEnumType = (schema: z.ZodEnum<NonEmptyArray<string>> | z.ZodNativeEnum<z.EnumLike>) => {
  const name = getSchemaName(schema)
  const enumRef = schema.enum
  registerEnumType(enumRef, { name, description: schema.description })
  cachedGqlTypes.set(name, enumRef)

  return enumRef
}

const getCachedZodGqlType = (schema: z.ZodType, type?: 'input' | 'output') => {
  const cached = cachedGqlTypes.get(getSchemaName(schema, type))

  if (!cached) {
    if (schema.constructor.name === z.ZodEnum.name) {
      return registerZodEnumType(schema as z.ZodEnum<NonEmptyArray<string>>)
    }

    throw new Error(`Not registered zod gql type. Schema:\n${printZodSchema(schema)}`)
  }

  return cached
}

const getNumberType = (schema: z.ZodNumber): GraphQLScalarType => {
  if (schema.isInt) {
    if (
      schema._def.checks.some(
        (check) =>
          check.kind === 'min' && ((check.value === 0 && !check.inclusive) || (check.value == 1 && check.inclusive))
      )
    )
      return GraphQLPositiveInt
    if (
      schema._def.checks.some(
        (check) =>
          check.kind === 'max' && ((check.value === 0 && !check.inclusive) || (check.value == -1 && check.inclusive))
      )
    )
      return GraphQLNegativeInt
    if (schema.minValue === 0) return GraphQLNonNegativeInt
    if (schema.maxValue === 0) return GraphQLNonPositiveInt

    return GraphQLFloat
  }

  if (
    schema._def.checks.some(
      (check) =>
        check.kind === 'min' && ((check.value === 0 && !check.inclusive) || (check.value > 0 && check.inclusive))
    )
  )
    return GraphQLPositiveFloat
  if (
    schema._def.checks.some(
      (check) =>
        check.kind === 'max' && ((check.value === 0 && !check.inclusive) || (check.value < 0 && check.inclusive))
    )
  )
    return GraphQLNegativeFloat
  if (schema.minValue === 0) return GraphQLNonNegativeFloat
  if (schema.maxValue === 0) return GraphQLNonPositiveFloat

  return GraphQLFloat
}

const getStringType = (schema: z.ZodString): GraphQLScalarType => {
  if (schema.isUUID || schema.isULID) return GraphQLUUID
  if (schema.isURL) return GraphQLURL
  if (schema.isEmail) return GraphQLEmailAddress
  return GraphQLString
}

const getScalarType = (schema: z.ZodType): GraphQLScalarType | Class | object => {
  const gqlType: GraphQLScalarType | Class | object | undefined = schema.getMeta()?.graphql?.type

  if (!gqlType) {
    switch (schema.constructor.name) {
      case z.ZodString.name: {
        return getStringType(schema as z.ZodString)
      }
      case z.ZodNumber.name: {
        return getNumberType(schema as z.ZodNumber)
      }
      case z.ZodBigInt.name: {
        return GraphQLBigInt
      }
      case z.ZodBoolean.name: {
        return GraphQLBoolean
      }
      case z.ZodDate.name: {
        return GraphQLDateTime
      }
      case z.ZodNativeEnum.name:
      case z.ZodEnum.name: {
        return getCachedZodGqlType(schema)
      }
    }
  }

  throw new TypeError(`Unsupported schema type: ${schema.constructor.name}`)
}

const getNullableType = (array: boolean, nullable: boolean, arrayNullable: boolean): boolean | NullableList => {
  if (!array) return nullable
  if (nullable && arrayNullable) return 'itemsAndList'
  if (nullable) return 'items'

  return arrayNullable
}

const registerType = (target: AnyClass<IDto>, type: 'input' | 'output') => {
  const schema = DtoUtils.getSchema(target)
  const name = getSchemaName(schema, type)

  if (cachedGqlTypes.has(name)) return

  const classDecorator = type === 'input' ? InputType : ObjectType
  classDecorator(name, { description: schema.description })(target)

  const storage: Map<string, AnyClass> = new Map()
  storage.set('', target)

  traversalSchema(schema, (schema, path, { object, array, nullable, arrayNullable, defaultValue }) => {
    const key = path.slice(0, -1).join('.')
    const field = path.at(-1)!
    const target = storage.get(key)
    const meta = schema.getMeta()?.graphql

    if (!target) return

    if (!object) {
      const gqlType = getScalarType(schema)

      Field(() => (array ? [gqlType] : gqlType), {
        nullable: getNullableType(array, nullable, arrayNullable),
        defaultValue,
        description: schema.description,
        deprecationReason: meta?.deprecationReason
      })(target.prototype as object, field)
      return
    }

    const name = getSchemaName(schema, type)
    let nestedGqlType = cachedGqlTypes.get(name)

    if (!nestedGqlType) {
      class Placeholder {}

      classDecorator(name, { description: schema.description })(Placeholder)
      Object.defineProperty(Placeholder, 'name', { value: name })
      storage.set(path.join('.'), Placeholder)
      cachedGqlTypes.set(name, Placeholder)
      nestedGqlType = Placeholder
    }

    Field(() => (array ? [nestedGqlType] : nestedGqlType), {
      nullable: getNullableType(array, nullable, arrayNullable),
      defaultValue,
      description: schema.description,
      deprecationReason: meta?.deprecationReason
    })(target.prototype as object, field)
  })
}

export const registerInputType = (target: AnyClass<IDto>) => {
  registerType(target, 'input')
}

export const registerOutputType = (target: AnyClass<IDto>) => {
  registerType(target, 'output')
}

import { DtoUtils, type IDto, traversalSchema } from '@internal/common'

import type { NullableList } from '@nestjs/graphql'
import { Field, InputType, ObjectType, registerEnumType } from '@nestjs/graphql'
import type { GraphQLScalarType } from 'graphql'
import { GraphQLBoolean, GraphQLFloat, GraphQLInt, GraphQLString } from 'graphql'
import { GraphQLBigInt, GraphQLDateTime, GraphQLEmailAddress, GraphQLURL, GraphQLUUID } from 'graphql-scalars'
import z from 'zod'

// Define the GraphQL metadata type
type GraphQLMetadata = {
  name?: string | { input: string; output: string }
  type?: GraphQLScalarType
  deprecationReason?: string
}
declare module 'zod' {
  interface GlobalMeta {
    graphql?: GraphQLMetadata
  }
}

const printZodSchema = (schema: z.ZodType) => JSON.stringify(z.toJSONSchema(schema), undefined, 2)

const getSchemaName = (schema: z.ZodType, type?: 'input' | 'output'): string => {
  const metadata = schema.meta()?.graphql
  const name = metadata?.name

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

const registerZodEnumType = (schema: z.ZodEnum) => {
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
      return registerZodEnumType(schema as z.ZodEnum)
    }

    throw new Error(`Not registered zod gql type. Schema:\n${printZodSchema(schema)}`)
  }

  return cached
}

const getScalarType = (schema: z.ZodType): GraphQLScalarType | Class | object => {
  const metadata = schema.meta()?.graphql
  const gqlType: GraphQLScalarType | Class | object | undefined = metadata?.type

  if (!gqlType) {
    switch (schema.constructor.name) {
      case z.ZodString.name: {
        return GraphQLString
      }
      case z.ZodUUID.name: {
        return GraphQLUUID
      }
      case z.ZodEmail.name: {
        return GraphQLEmailAddress
      }
      case z.ZodURL.name: {
        return GraphQLURL
      }
      case z.ZodNumber.name: {
        return (schema as z.ZodNumber).format?.includes('int') ? GraphQLInt : GraphQLFloat
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
    const meta = schema.meta()?.graphql

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

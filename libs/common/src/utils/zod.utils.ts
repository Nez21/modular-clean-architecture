import z from 'zod'

export const traversalSchema = (
  schema: z.AnyZodObject,
  handler: (
    schema: z.ZodType,
    path: string[],
    attributes: { object: boolean; array: boolean; nullable: boolean; arrayNullable: boolean; defaultValue?: unknown }
  ) => void
) => {
  const recurse = (
    schema: z.ZodType,
    attributes: { nullable: boolean; array: boolean; arrayNullable: boolean; defaultValue?: unknown },
    path: string[] = []
  ) => {
    if ([z.ZodNullable.name, z.ZodOptional.name].includes(schema.constructor.name)) {
      recurse(
        (schema as z.ZodNullable<z.ZodType> | z.ZodOptional<z.ZodType>).unwrap(),
        { ...attributes, nullable: true },
        path
      )
      return
    }

    if (schema.constructor.name === z.ZodArray.name) {
      recurse(
        (schema as z.ZodArray<z.ZodType>).element,
        { array: true, nullable: false, arrayNullable: attributes.nullable },
        path
      )
      return
    }

    if (schema.constructor.name === z.ZodDefault.name) {
      recurse(
        (schema as z.ZodDefault<z.ZodType>)._def.innerType,
        { ...attributes, defaultValue: (schema as z.ZodDefault<z.ZodType>)._def.defaultValue() as unknown },
        path
      )
      return
    }

    if (path.length > 0) {
      handler(schema, path, { object: schema.constructor.name === z.ZodObject.name, ...attributes })
    }

    if (schema.constructor.name === z.ZodObject.name) {
      for (const [key, value] of Object.entries<z.ZodType>(
        (schema as z.AnyZodObject).shape as Record<string, z.ZodType>
      )) {
        recurse(value, { nullable: false, array: false, arrayNullable: false }, [...path, key])
      }
    }
  }

  recurse(schema, { nullable: false, array: false, arrayNullable: false })
}

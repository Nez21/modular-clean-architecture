import z from 'zod'
import { core } from 'zod/v4'

export const traversalSchema = (
  schema: z.ZodObject,
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
      const defaultSchema = schema as z.ZodDefault<z.ZodType>
      const defaultValue: unknown =
        typeof defaultSchema.def.defaultValue === 'function'
          ? defaultSchema.def.defaultValue()
          : defaultSchema.def.defaultValue
      recurse(defaultSchema.def.innerType, { ...attributes, defaultValue }, path)
      return
    }

    if (path.length > 0) {
      handler(schema, path, { object: schema.constructor.name === z.ZodObject.name, ...attributes })
    }

    if (schema.constructor.name === z.ZodObject.name) {
      for (const [key, value] of Object.entries<z.ZodType>(
        (schema as z.ZodObject).shape as Record<string, z.ZodType>
      )) {
        recurse(value, { nullable: false, array: false, arrayNullable: false }, [...path, key])
      }
    }
  }

  recurse(schema, { nullable: false, array: false, arrayNullable: false })
}

declare module 'zod' {
  interface ZodType<
    out Output = unknown,
    out Input = unknown,
    out Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<Output, Input>
  > extends core.$ZodType<Output, Input, Internals> {
    looseOptional(): z.ZodPipe<
      z.ZodOptional<z.ZodNullable<this>>,
      z.ZodTransform<Exclude<z.infer<this>, null> | undefined, z.infer<this>>
    >
  }
}

export const extendZodType = (zod: typeof z) => {
  zod.ZodType.prototype.looseOptional ??= function (this: z.ZodType) {
    return this.nullish().transform((v) => v ?? undefined)
  }
}

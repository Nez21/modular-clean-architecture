import ms from 'ms'
import { camel, mapKeys } from 'radash'
import { z } from 'zod'

const configSchema = z
  .record(z.string(), z.any())
  .transform((record) => mapKeys(record, (key) => camel(key)))
  .pipe(
    z.object({
      appPort: z.coerce.number().default(3000),
      nodeEnv: z.enum(['development', 'production']).default('development'),
      appLogLevel: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),

      valkeyUrl: z.url(),

      restateUrl: z.url(),
      restateAppPort: z.coerce.number().default(4000),

      identityPostgresUrl: z.url(),
      ticketPostgresUrl: z.url(),

      jwtSecret: z.string().min(32),
      jwtExpiresIn: z
        .string()
        .default('7d')
        .refine((value) => Number.isInteger(ms(value as ms.StringValue)), {
          message: 'Invalid JWT expires in value'
        })
        .transform((value) => value as ms.StringValue)
    })
  )

export const cfg = configSchema.parse(structuredClone(process.env))

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

      valkeyUrl: z.string().url(),

      restateUrl: z.string().url(),
      restateAppPort: z.coerce.number().default(4000),

      userPostgresUrl: z.string().url()
    })
  )

export const cfg = configSchema.parse(process.env)

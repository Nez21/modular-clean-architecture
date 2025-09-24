import { ValueObject } from '@internal/common'

import z from 'zod'

export class Address extends ValueObject(
  z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    zipCode: z.string()
  })
) {}

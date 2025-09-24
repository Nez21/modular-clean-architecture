import z from 'zod'

import { ValueObject } from '@internal/common'

export class Address extends ValueObject(
  z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    zipCode: z.string()
  })
) {}

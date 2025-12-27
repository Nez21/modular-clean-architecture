import { createIdSchema } from '@internal/common'

import { z } from 'zod'

export const UserId = createIdSchema('UserId', 'user')
export type UserId = z.infer<typeof UserId>

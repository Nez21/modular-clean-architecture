import { Token } from '@internal/common'

import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import type * as schema from './postgres-data.schema'

export const Connection = Token<NodePgDatabase<typeof schema>>('LocalizationDatabase')

import type z from 'zod'

import type { TokenFn } from '@internal/common'
import { MetadataKey } from '@internal/common'

import type { BaseCommand } from './command.interface'
import type { BaseEvent } from './event.interface'
import type { BasePipelineBehavior } from './pipeline-behavior.interface'
import type { BaseQuery } from './query.interface'

export const MetadataKeys = {
  Command: MetadataKey<AnyClass<BaseCommand>>('Command'),
  Query: MetadataKey<AnyClass<BaseQuery>>('Query'),
  Events: MetadataKey<AnyClass<BaseEvent>[]>('Events'),
  UsePipelineBehaviors:
    MetadataKey<(TokenFn<BasePipelineBehavior> | Class<BasePipelineBehavior> | BasePipelineBehavior)[]>(
      'UsePipelineBehaviors'
    ),
  Schema: MetadataKey<z.ZodObject | z.ZodType<{ type: string }>>('Schema')
} as const

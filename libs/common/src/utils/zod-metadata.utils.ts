/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type z from 'zod'

declare module 'zod' {
  interface ZodMeta {
    [k: string | number | symbol]: unknown
  }

  interface ZodTypeDef {
    meta?: ZodMeta
  }

  interface ZodType<Output = any, Def extends z.ZodTypeDef = z.ZodTypeDef, Input = Output> {
    getMeta(): this['_def'] extends { meta: infer M } ? M : ZodMeta | undefined
    meta<TThis extends ZodType, TMeta extends ZodMeta = ZodMeta>(
      this: TThis,
      meta: TMeta
    ): TThis &
      ZodType<
        TThis['_output'],
        TThis['_def'] extends { meta: infer M } ? TThis['_def'] & { meta: M & TMeta } : TThis['_def'] & { meta: TMeta },
        TThis['_input']
      >
  }
}

export const registerZodMetadata = (zod: typeof z) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!zod.ZodType.prototype.meta) {
    zod.ZodType.prototype.meta = function (meta: z.ZodMeta) {
      this._def.meta = { ...this._def.meta, ...meta }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this as any
    }

    zod.ZodType.prototype.getMeta = function () {
      return this._def.meta
    }
  }
}

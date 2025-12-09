import { defer, lastValueFrom, mergeAll, type Observable } from 'rxjs'

interface CallHandler {
  handle(): Observable<unknown>
}

export interface PipelineContext {
  class: Function
  instance: unknown
  handler: Function
}

export interface PipelineFunction<TInput extends any[] = any[]> {
  (args: TInput, next: CallHandler, ctx: PipelineContext): Observable<unknown> | Promise<Observable<unknown>>
}

export const pipelineMetadataKey = Symbol('pipeline')

export const wrapPipeline = <TInput extends any[]>(fn: PipelineFunction<TInput>): MethodDecorator => {
  return (target, propertyKey, descriptor) => {
    let pipeline = (Reflect.getMetadata(pipelineMetadataKey, target, propertyKey) ?? []) as PipelineFunction<TInput>[]
    Reflect.defineMetadata(pipelineMetadataKey, [...pipeline, fn], target, propertyKey)

    if (pipeline.length > 0) return

    const originalMethod = descriptor.value

    if (!originalMethod) {
      throw new TypeError('Method not found')
    }

    if (typeof originalMethod !== 'function') {
      throw new TypeError('Method is not a function')
    }

    descriptor.value = function (this: any, ...args: TInput) {
      const ctx: PipelineContext = {
        class: target.constructor,
        instance: this,
        handler: originalMethod
      }
      let chain: CallHandler = {
        handle: () => defer(() => Promise.resolve(originalMethod.apply(this, args)))
      }

      pipeline = Reflect.getMetadata(pipelineMetadataKey, target, propertyKey) as PipelineFunction<TInput>[]

      for (const pipelineFn of pipeline) {
        const nextHandler = chain.handle

        chain = {
          handle: () => {
            const next: CallHandler = { handle: nextHandler }

            return defer(() => Promise.resolve(pipelineFn(args, next, ctx))).pipe(mergeAll())
          }
        }
      }

      return lastValueFrom(chain.handle())
    } as typeof originalMethod
  }
}

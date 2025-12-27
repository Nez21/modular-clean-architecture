import { TokenFn } from '@internal/common'

import { DiscoveryService } from '@golevelup/nestjs-discovery'
import { CallHandler, Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { defer, lastValueFrom, mergeAll, Observable } from 'rxjs'

import { BaseCommand, CommandResultOf, ICommandHandler } from './command.interface'
import { BaseEvent, IEventHandler } from './event.interface'
import { MetadataKeys } from './mediator.const'
import { IMediator } from './mediator.interface'
import { MediatorModuleOptions } from './mediator.module.interface'
import { BasePipelineBehavior, PipelineBehaviorContext, PipelineBehaviorInput } from './pipeline-behavior.interface'
import { BaseQuery, IQueryHandler, QueryResultOf } from './query.interface'

@Injectable()
export class Mediator implements IMediator, OnApplicationBootstrap {
  public static readonly logger = new Logger(Mediator.name)

  private queryHandlers: Map<AnyClass<BaseQuery>, Class<IQueryHandler>> = new Map()
  private commandHandlers: Map<AnyClass<BaseCommand>, Class<ICommandHandler>> = new Map()
  private eventHandlers: Map<AnyClass<BaseEvent>, Class<IEventHandler>[]> = new Map()
  private defaultPipelineBehaviors: (TokenFn<BasePipelineBehavior> | Class<BasePipelineBehavior>)[] = []
  private handlerSpecificBehaviors: Map<
    Class,
    (TokenFn<BasePipelineBehavior> | Class<BasePipelineBehavior> | BasePipelineBehavior)[]
  > = new Map()

  constructor(
    @Inject(MediatorModuleOptions) options: MediatorModuleOptions | undefined,
    private readonly discoveryService: DiscoveryService,
    private readonly moduleRef: ModuleRef
  ) {
    this.defaultPipelineBehaviors = options?.defaultBehaviors ?? []
  }

  async onApplicationBootstrap(): Promise<void> {
    const queryHandlersMetadata = await this.discoveryService.providersWithMetaAtKey<Class>(MetadataKeys.Query)

    for (const { meta: queryType, discoveredClass } of queryHandlersMetadata) {
      this.queryHandlers.set(queryType as AnyClass<BaseQuery>, discoveredClass.injectType as Class<IQueryHandler>)

      Mediator.logger.log(`${queryType.name} {query} -> ${String(discoveredClass.injectType?.name)}`)
    }

    const commandHandlersMetadata = await this.discoveryService.providersWithMetaAtKey<Class>(MetadataKeys.Command)

    for (const { meta: commandType, discoveredClass } of commandHandlersMetadata) {
      this.commandHandlers.set(
        commandType as AnyClass<BaseCommand>,
        discoveredClass.injectType as Class<ICommandHandler>
      )

      Mediator.logger.log(`${commandType.name} {command} -> ${String(discoveredClass.injectType?.name)}`)
    }

    const eventHandlersMetadata = await this.discoveryService.providersWithMetaAtKey<Class[]>(MetadataKeys.Events)

    for (const { meta: eventTypes, discoveredClass } of eventHandlersMetadata) {
      if (Array.isArray(eventTypes)) {
        for (const eventType of eventTypes) {
          const handlers = this.eventHandlers.get(eventType as AnyClass<BaseEvent>) || []
          handlers.push(discoveredClass.injectType as Class<IEventHandler>)
          this.eventHandlers.set(eventType as AnyClass<BaseEvent>, handlers)
        }

        const eventTypesNames = eventTypes.map((eventType) => eventType.name).join(', ')

        Mediator.logger.log(`${eventTypesNames} {event} -> ${String(discoveredClass.injectType?.name)}`)
      }
    }

    const specificBehaviorsMetadata = await this.discoveryService.providersWithMetaAtKey<
      (TokenFn<BasePipelineBehavior> | Class<BasePipelineBehavior>)[]
    >(MetadataKeys.UsePipelineBehaviors)

    for (const { discoveredClass, meta: behaviorTypes } of specificBehaviorsMetadata) {
      this.moduleRef.introspect(discoveredClass.injectType as Class<BasePipelineBehavior>)

      if (Array.isArray(behaviorTypes) && behaviorTypes.length > 0) {
        this.handlerSpecificBehaviors.set(discoveredClass.injectType as Class, behaviorTypes)

        Mediator.logger.log(`${behaviorTypes.join(', ')} {behavior} -> ${String(discoveredClass.injectType?.name)}`)
      }
    }

    for (const pipelineBehavior of this.defaultPipelineBehaviors) {
      this.moduleRef.introspect(pipelineBehavior as Class<BasePipelineBehavior>)

      Mediator.logger.log(`${pipelineBehavior.name} {behavior}`)
    }
  }

  async send<TCommand extends BaseCommand>(command: TCommand): Promise<CommandResultOf<TCommand>>
  async send<TQuery extends BaseEvent>(query: TQuery): Promise<QueryResultOf<TQuery>>
  async send<TRequest extends BaseCommand | BaseQuery>(
    request: TRequest
  ): Promise<
    | CommandResultOf<TRequest extends BaseCommand ? TRequest : never>
    | QueryResultOf<TRequest extends BaseQuery ? TRequest : never>
  > {
    const requestType = request.constructor as Class
    const queryHandlerType = this.queryHandlers.get(requestType as AnyClass<BaseQuery>)
    const data = Object.assign(Reflect.construct(requestType, []), structuredClone(request))

    if (queryHandlerType) {
      const handler = this.moduleRef.get(queryHandlerType, { strict: false })
      const context = new PipelineBehaviorContext({
        class: queryHandlerType,
        instance: handler,
        handler: handler.handle
      })

      const pipeline = this.buildPipeline(
        {
          type: 'query',
          data: data as BaseQuery & Record<string, unknown>,
          context
        },
        () => defer(async () => await Promise.resolve(handler.handle(request as BaseQuery)))
      )

      return (await lastValueFrom(pipeline)) as QueryResultOf<TRequest extends BaseQuery ? TRequest : never>
    }

    const commandHandlerType = this.commandHandlers.get(requestType as AnyClass<BaseCommand>)

    if (commandHandlerType) {
      const handler = this.moduleRef.get(commandHandlerType, { strict: false })
      const context = new PipelineBehaviorContext({
        class: commandHandlerType,
        instance: handler,
        handler: handler.handle
      })
      const pipeline = this.buildPipeline(
        {
          type: 'command',
          data: data as BaseCommand & Record<string, unknown>,
          context
        },
        () => defer(async () => await Promise.resolve(handler.handle(request as BaseCommand)))
      )

      return (await lastValueFrom(pipeline)) as CommandResultOf<TRequest extends BaseCommand ? TRequest : never>
    }

    throw new Error(`No handler registered for request type: ${requestType.name}`)
  }

  async publish<TEvent extends BaseEvent>(event: TEvent): Promise<void> {
    const eventType = event.constructor as Class<BaseEvent>
    const handlerTypes = this.eventHandlers.get(eventType) || []
    const data = Object.assign(Reflect.construct(eventType, []), structuredClone(event))

    if (handlerTypes.length === 0) {
      Mediator.logger.warn(`No handler registered for event type: ${eventType.name}`)
    }

    const publishPromises = handlerTypes.map(async (handlerType) => {
      const handler = this.moduleRef.get(handlerType, { strict: false })
      const context = new PipelineBehaviorContext({
        class: handlerType,
        instance: handler,
        handler: handler.handle
      })
      const pipeline = this.buildPipeline(
        {
          type: 'event',
          data: data as BaseEvent & Record<string, unknown>,
          context
        },
        () =>
          defer(async () => {
            await Promise.resolve(handler.handle(event))
          })
      )

      await lastValueFrom(pipeline)
    })

    const results = await Promise.allSettled(publishPromises)
    const errors = results
      .filter((result) => result.status === 'rejected')
      .map((result: PromiseRejectedResult) => result.reason as Error)

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Failed to publish event')
    }
  }

  private buildPipeline(input: PipelineBehaviorInput, finalHandler: () => Observable<unknown>): Observable<unknown> {
    const specificBehaviors = this.handlerSpecificBehaviors.get(input.context.class) || []
    const allBehaviors = [...this.defaultPipelineBehaviors, ...specificBehaviors].map((type) =>
      typeof type === 'object' ? type : this.moduleRef.get(type, { strict: false })
    )

    if (allBehaviors.length === 0) {
      return finalHandler()
    }

    let chain = { handle: finalHandler }

    for (const behavior of allBehaviors) {
      const nextHandler = chain.handle

      chain = {
        handle: () => {
          const next: CallHandler = { handle: nextHandler }

          return defer(async () => await Promise.resolve(behavior.handle(input, next))).pipe(mergeAll())
        }
      }
    }

    return chain.handle()
  }
}

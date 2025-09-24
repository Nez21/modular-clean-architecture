import { DiscoveryModule, DiscoveryService } from '@golevelup/nestjs-discovery'
import { Inject, Logger, type DynamicModule, type OnApplicationBootstrap } from '@nestjs/common'

import { ModuleRef } from '@nestjs/core'
import {
  endpoint,
  service,
  object,
  handlers,
  workflow,
  WorkflowContext,
  WorkflowSharedContext,
  Context,
  ObjectContext,
  ObjectSharedContext
} from '@restatedev/restate-sdk'
import { connect } from '@restatedev/restate-sdk-clients'

import { Token } from '@internal/common'

import { MetadataKeys } from './restate.const'
import {
  IRestateHandler,
  IRestateClient,
  IRestateSharedHandler,
  ServiceMetadata,
  ObjectMetadata,
  WorkflowMetadata
} from './restate.interface'

export interface RestateModuleOptions {
  client: {
    url: string
    headers?: Record<string, string>
  }
  appPort: number
}

const RestateModuleOptions = Token<RestateModuleOptions>('RestateModuleOptions')

export class RestateModule implements OnApplicationBootstrap {
  private static logger = new Logger(RestateModule.name)

  constructor(
    private readonly moduleRef: ModuleRef,
    @Inject(DiscoveryService) private readonly discoveryService: DiscoveryService,
    @Inject(RestateModuleOptions) private readonly options: RestateModuleOptions
  ) {}

  static forRoot(options: RestateModuleOptions): DynamicModule {
    return {
      module: RestateModule,
      global: true,
      imports: [DiscoveryModule],
      providers: [RestateModuleOptions({ useValue: options }), IRestateClient({ useValue: connect(options.client) })]
    }
  }

  async onApplicationBootstrap() {
    const restateEndpoint = endpoint()

    const services = await this.discoveryService.providersWithMetaAtKey<ServiceMetadata>(MetadataKeys.Service)

    for (const {
      meta: { name, metadata, description },
      discoveredClass
    } of services) {
      const handlerMethods = this.discoveryService.classMethodsWithMetaAtKey(discoveredClass, MetadataKeys.Handler)

      for (const handlerMethod of handlerMethods) {
        RestateModule.logger.log(`${name} {service} -> ${handlerMethod.discoveredMethod.methodName} {handler}`)
      }

      const restateService = service({
        name,
        handlers: Object.fromEntries(
          handlerMethods.map((handler) => [
            handler.discoveredMethod.methodName,
            async (ctx: Context, ...args: unknown[]): Promise<unknown> => {
              const injectType = discoveredClass.injectType as Class<Record<string, IRestateHandler>>
              const instance = this.moduleRef.get(injectType, { strict: false })

              return await Promise.resolve(instance[handler.discoveredMethod.methodName](ctx, ...args))
            }
          ])
        ),
        metadata,
        description
      })

      restateEndpoint.bind(restateService)
    }

    const virtualObjects = await this.discoveryService.providersWithMetaAtKey<ObjectMetadata>(MetadataKeys.Object)

    for (const {
      meta: { name, metadata, description },
      discoveredClass
    } of virtualObjects) {
      const handlerMethods = this.discoveryService.classMethodsWithMetaAtKey(discoveredClass, MetadataKeys.Handler)

      for (const handlerMethod of handlerMethods) {
        RestateModule.logger.log(`${name} {object} -> ${handlerMethod.discoveredMethod.methodName} {handler}`)
      }

      const sharedHandlerMethods = this.discoveryService.classMethodsWithMetaAtKey(
        discoveredClass,
        MetadataKeys.SharedHandler
      )

      for (const handlerMethod of sharedHandlerMethods) {
        RestateModule.logger.log(`${name} {object} -> ${handlerMethod.discoveredMethod.methodName} {shared handler}`)
      }

      const restateObject = object({
        name,
        handlers: {
          ...Object.fromEntries(
            handlerMethods.map((handler) => [
              handler.discoveredMethod.methodName,
              async (ctx: ObjectContext, ...args: unknown[]): Promise<unknown> => {
                const injectType = discoveredClass.injectType as Class<Record<string, IRestateHandler>>
                const instance = this.moduleRef.get(injectType, { strict: false })

                return await Promise.resolve(instance[handler.discoveredMethod.methodName](ctx, ...args))
              }
            ])
          ),
          ...Object.fromEntries(
            sharedHandlerMethods.map((handler) => [
              handler.discoveredMethod.methodName,
              handlers.object.shared(async (ctx: ObjectSharedContext, ...args: unknown[]): Promise<unknown> => {
                const injectType = discoveredClass.injectType as Class<Record<string, IRestateSharedHandler>>
                const instance = this.moduleRef.get(injectType, { strict: false })

                return await Promise.resolve(instance[handler.discoveredMethod.methodName](ctx, ...args))
              })
            ])
          )
        },
        metadata,
        description
      })

      restateEndpoint.bind(restateObject)
    }

    const workflows = await this.discoveryService.providersWithMetaAtKey<WorkflowMetadata>(MetadataKeys.Workflow)

    for (const {
      meta: { name, metadata, description },
      discoveredClass
    } of workflows) {
      const sharedHandlerMethods = this.discoveryService.classMethodsWithMetaAtKey(
        discoveredClass,
        MetadataKeys.SharedHandler
      )

      RestateModule.logger.log(`${name} {workflow} -> run {handler}`)

      for (const handlerMethod of sharedHandlerMethods) {
        RestateModule.logger.log(`${name} {workflow} -> ${handlerMethod.discoveredMethod.methodName} {shared handler}`)
      }

      const restateWorkflow = workflow({
        name,
        handlers: {
          run: async (ctx: WorkflowContext, ...args: unknown[]): Promise<unknown> => {
            const injectType = discoveredClass.injectType as Class<Record<'run', IRestateHandler>>
            const instance = this.moduleRef.get(injectType, { strict: false })

            return await Promise.resolve(instance.run(ctx, ...args))
          },
          ...Object.fromEntries(
            sharedHandlerMethods.map((handler) => [
              handler.discoveredMethod.methodName,
              handlers.workflow.shared(async (ctx: WorkflowSharedContext, ...args: unknown[]): Promise<unknown> => {
                const injectType = discoveredClass.injectType as Class<Record<string, IRestateSharedHandler>>
                const instance = this.moduleRef.get(injectType, { strict: false })

                return await Promise.resolve(instance[handler.discoveredMethod.methodName](ctx, ...args))
              })
            ])
          )
        },
        metadata,
        description
      })

      restateEndpoint.bind(restateWorkflow)
    }

    restateEndpoint.setLogger((meta, message, ...args: unknown[]) => {
      switch (meta.level.toString()) {
        case 'error': {
          RestateModule.logger.error(message, meta, ...args)
          break
        }
        case 'warn': {
          RestateModule.logger.warn(message, meta, ...args)
          break
        }
        case 'debug': {
          RestateModule.logger.debug(message, meta, ...args)
          break
        }
        case 'trace': {
          RestateModule.logger.verbose(message, meta, ...args)
          break
        }
        default: {
          RestateModule.logger.log(message, meta, ...args)
          break
        }
      }
    })

    await restateEndpoint.listen(this.options.appPort)
  }
}

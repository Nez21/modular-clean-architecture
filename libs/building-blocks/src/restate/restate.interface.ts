import { Token } from '@internal/common'

import type {
  Context,
  ObjectContext,
  ObjectSharedContext,
  WorkflowContext,
  WorkflowSharedContext
} from '@restatedev/restate-sdk'
import type { Ingress } from '@restatedev/restate-sdk-clients'

export type IRestateClient = Ingress
export const IRestateClient = Token<IRestateClient>('IRestateClient')
export type RestateContext = Context
export type RestateObjectContext = ObjectContext
export type RestateWorkflowContext = WorkflowContext
export type RestateSharedObjectContext = ObjectSharedContext
export type RestateSharedWorkflowContext = WorkflowSharedContext

export interface ServiceMetadata {
  name: string
  metadata?: Record<string, string>
  description?: string
}

export interface ObjectMetadata {
  name: string
  metadata?: Record<string, string>
  description?: string
}

export interface WorkflowMetadata {
  name: string
  metadata?: Record<string, string>
  description?: string
}

export interface IRestateWorkflow {
  run(ctx: RestateWorkflowContext, ...args: any[]): any
}

export interface IRestateHandler {
  (ctx: RestateContext, ...args: any[]): any
}

export interface IRestateSharedHandler {
  (ctx: RestateSharedObjectContext | RestateSharedWorkflowContext, ...args: any[]): any
}

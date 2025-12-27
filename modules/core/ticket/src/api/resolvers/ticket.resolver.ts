import { IMediator } from '@internal/building-blocks/mediator'

import { Inject } from '@nestjs/common'
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql'

import { TicketDto } from '#/application/shared/ticket.interface'
import {
  AssignTicketCommand,
  CreateTicketCommand,
  UpdateTicketPriorityCommand,
  UpdateTicketStatusCommand
} from '#/application/use-cases/ticket'

@Resolver()
export class TicketResolver {
  constructor(@Inject(IMediator) private readonly mediator: IMediator) {}

  @Query(() => [TicketDto], { description: 'Get all tickets' })
  async ticketList(): Promise<TicketDto[]> {
    return []
  }

  @Mutation(() => ID, { description: 'Create a new ticket' })
  async createTicket(@Args('input') command: CreateTicketCommand): Promise<string> {
    const result = await this.mediator.send(command)

    if (result.isErr()) {
      throw result.error
    }

    return result.value
  }

  @Mutation(() => Boolean, { description: 'Assign a ticket to an agent' })
  async assignTicket(@Args('input') command: AssignTicketCommand): Promise<boolean> {
    const result = await this.mediator.send(command)

    if (result.isErr()) {
      throw result.error
    }

    return true
  }

  @Mutation(() => Boolean, { description: 'Update ticket status' })
  async updateTicketStatus(@Args('input') command: UpdateTicketStatusCommand): Promise<boolean> {
    const result = await this.mediator.send(command)

    if (result.isErr()) {
      throw result.error
    }

    return true
  }

  @Mutation(() => Boolean, { description: 'Update ticket priority' })
  async updateTicketPriority(@Args('input') command: UpdateTicketPriorityCommand): Promise<boolean> {
    const result = await this.mediator.send(command)

    if (result.isErr()) {
      throw result.error
    }

    return true
  }
}

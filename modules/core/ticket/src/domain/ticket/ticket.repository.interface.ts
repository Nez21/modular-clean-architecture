import { Token } from '@internal/common'

import { ResultAsync } from 'neverthrow'

import type { Ticket, TicketId } from './ticket.aggregate-root'
import { TicketError } from './ticket.error'

export interface ITicketRepository {
  findById(id: TicketId): ResultAsync<Ticket, TicketError>
  insert(ticket: Ticket): ResultAsync<void, TicketError>
  update(ticket: Ticket): ResultAsync<void, TicketError>
  delete(id: TicketId): ResultAsync<void, TicketError>
}

export const ITicketRepository = Token<ITicketRepository>('ITicketRepository')

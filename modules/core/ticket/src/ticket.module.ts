import { TicketResolver } from './api/resolvers'
import {
  TicketAssignedEventHandler,
  TicketCreatedEventHandler,
  TicketPriorityChangedEventHandler,
  TicketStatusChangedEventHandler
} from './application/event-handlers'
import {
  AssignTicketHandler,
  CreateTicketHandler,
  UpdateTicketPriorityHandler,
  UpdateTicketStatusHandler
} from './application/use-cases/ticket'
import type { PostgresDataModuleOptions } from './data/postgres'
import { PostgresDataModule } from './data/postgres'

export interface TicketModuleOptions {
  postgres: PostgresDataModuleOptions
}

export class TicketModule {
  static register(options: TicketModuleOptions) {
    const { postgres } = options

    return {
      module: TicketModule,
      imports: [PostgresDataModule.register(postgres)],
      providers: [
        // Resolvers
        TicketResolver,

        // Use Cases
        CreateTicketHandler,
        AssignTicketHandler,
        UpdateTicketStatusHandler,
        UpdateTicketPriorityHandler,

        // Event Handlers
        TicketCreatedEventHandler,
        TicketAssignedEventHandler,
        TicketPriorityChangedEventHandler,
        TicketStatusChangedEventHandler
      ]
    }
  }
}

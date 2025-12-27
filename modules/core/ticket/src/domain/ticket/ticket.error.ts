export class TicketError extends Error {
  type = 'TicketError'
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }

  static notFound(): TicketError {
    return new TicketError('TicketNotFound', 'Ticket not found')
  }

  static alreadyExists(): TicketError {
    return new TicketError('TicketAlreadyExists', 'Ticket already exists')
  }

  static invalidStatusTransition(): TicketError {
    return new TicketError('InvalidStatusTransition', 'Invalid status transition')
  }

  static notAssigned(): TicketError {
    return new TicketError('TicketNotAssigned', 'Ticket is not assigned')
  }

  static alreadyAssigned(): TicketError {
    return new TicketError('TicketAlreadyAssigned', 'Ticket is already assigned')
  }

  toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      code: this.code,
      message: this.message
    }
  }
}

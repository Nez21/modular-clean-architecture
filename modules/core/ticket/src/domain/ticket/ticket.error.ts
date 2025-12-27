export enum TicketErrorCode {
  Invalid = 'Invalid',
  NotFound = 'NotFound',
  AlreadyExists = 'AlreadyExists',
  InvalidStatusTransition = 'InvalidStatusTransition',
  NotAssigned = 'NotAssigned',
  AlreadyAssigned = 'AlreadyAssigned'
}

export class TicketError extends Error {
  type = 'TicketError'
  code: TicketErrorCode

  constructor(code: TicketErrorCode, message: string) {
    super(message)
    this.code = code
  }

  static invalid(): TicketError {
    return new TicketError(TicketErrorCode.Invalid, 'Invalid ticket')
  }

  static notFound(): TicketError {
    return new TicketError(TicketErrorCode.NotFound, 'Ticket not found')
  }

  static alreadyExists(): TicketError {
    return new TicketError(TicketErrorCode.AlreadyExists, 'Ticket already exists')
  }

  static invalidStatusTransition(): TicketError {
    return new TicketError(TicketErrorCode.InvalidStatusTransition, 'Invalid status transition')
  }

  static notAssigned(): TicketError {
    return new TicketError(TicketErrorCode.NotAssigned, 'Ticket is not assigned')
  }

  static alreadyAssigned(): TicketError {
    return new TicketError(TicketErrorCode.AlreadyAssigned, 'Ticket is already assigned')
  }

  toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      code: this.code,
      message: this.message
    }
  }
}

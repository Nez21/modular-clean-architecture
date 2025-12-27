export interface IWithDomainEvents<T> {
  addDomainEvent(event: T): void
  getDomainEvents(): readonly T[]
  clearDomainEvents(): void
}

export class WithDomainEventsMixin<TEvents> {
  private readonly domainEvents: TEvents[] = []

  addDomainEvent(event: TEvents): void {
    this.domainEvents.push(event)
  }

  getDomainEvents(): readonly TEvents[] {
    return [...this.domainEvents]
  }

  clearDomainEvents(): void {
    this.domainEvents.length = 0
  }
}

import { DomainEvent } from '../../domain/shared/types';

export interface EventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
}

export class InMemoryEventBus implements EventBus {
  constructor(private readonly handlers: ((event: DomainEvent) => Promise<void>)[] = []) {}

  addHandler(handler: (event: DomainEvent) => Promise<void>) {
    this.handlers.push(handler);
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    await Promise.all(this.handlers.map((handler) => handler(event)));
  }
}

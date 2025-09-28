export type UUID = string;

export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  id: UUID;
  type: TType;
  occurredAt: Date;
  payload: TPayload;
}

import { DomainEvent, UUID } from '../../shared/types';

export interface VoteSubmittedPayload {
  voteId: UUID;
  comparisonId: UUID;
  variantId: UUID;
  userId: UUID;
  submittedAt: Date;
}

export type VoteSubmittedEvent = DomainEvent<'VoteSubmitted', VoteSubmittedPayload>;

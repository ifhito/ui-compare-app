import { DomainEvent, UUID } from '../../shared/types';

export interface ComparisonPublishedPayload {
  comparisonId: UUID;
  publishedAt: Date;
}

export type ComparisonPublishedEvent = DomainEvent<'ComparisonPublished', ComparisonPublishedPayload>;

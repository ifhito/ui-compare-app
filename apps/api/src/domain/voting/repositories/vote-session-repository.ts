import { VoteSession } from '../entities/vote-session';
import { UUID } from '../../shared/types';

export interface VoteSessionRepository {
  createWithIdempotency(session: VoteSession): Promise<VoteSession | null>;
  findByIdempotencyKey(comparisonId: UUID, userId: UUID): Promise<VoteSession | null>;
}

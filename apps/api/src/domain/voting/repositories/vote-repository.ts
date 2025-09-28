import { Vote } from '../entities/vote';
import { UUID } from '../../shared/types';

export interface VoteRepository {
  save(vote: Vote): Promise<void>;
  countByComparison(comparisonId: UUID): Promise<number>;
  countByVariant(comparisonId: UUID): Promise<Record<string, number>>;
  listRecent(comparisonId: UUID, limit: number): Promise<Vote[]>;
}

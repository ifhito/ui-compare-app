import { RateLimiter } from '../../application/voting/submit-vote';
import { UUID } from '../../domain/shared/types';

export class NoopRateLimiter implements RateLimiter {
  async isRateLimited(_userId: UUID, _comparisonId: UUID): Promise<boolean> {
    return false;
  }
}

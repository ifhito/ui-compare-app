import { VoteSessionRepository } from '../../domain/voting/repositories/vote-session-repository';
import { VoteRepository } from '../../domain/voting/repositories/vote-repository';
import { ComparisonRepository } from '../../domain/comparison/repositories/comparison-repository';
import { DomainError } from '../errors';
import { UUID } from '../../domain/shared/types';
import { VoteSession } from '../../domain/voting/entities/vote-session';
import { Vote } from '../../domain/voting/entities/vote';
import { ensureVotingAllowed } from '../../domain/voting/services/voting-policy-service';
import { EventBus } from '../shared/event-bus';
import { VoteSubmittedEvent } from '../../domain/voting/events/vote-submitted';

export interface SubmitVoteInput {
  comparisonId: UUID;
  userId: UUID;
  variantId: UUID;
  turnstileToken: string;
  comment?: string | null;
}

export interface TurnstileVerifier {
  verify(token: string): Promise<boolean>;
}

export interface RateLimiter {
  isRateLimited(userId: UUID, comparisonId: UUID): Promise<boolean>;
}

export class SubmitVoteCommand {
  constructor(
    private readonly comparisonRepository: ComparisonRepository,
    private readonly voteSessionRepository: VoteSessionRepository,
    private readonly voteRepository: VoteRepository,
    private readonly turnstileVerifier: TurnstileVerifier,
    private readonly rateLimiter: RateLimiter,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: SubmitVoteInput) {
    const comparison = await this.comparisonRepository.findById(input.comparisonId);
    if (!comparison) {
      throw new DomainError('comparison_not_found', 'Comparison not found');
    }
    if (comparison.status !== 'published') {
      throw new DomainError('comparison_not_published', 'Voting is only allowed on published comparisons');
    }
    if (comparison.expiresAt && comparison.expiresAt < new Date()) {
      throw new DomainError('comparison_closed', 'Voting period has ended');
    }

    const variant = comparison.variants.find((v) => v.id === input.variantId);
    if (!variant) {
      throw new DomainError('variant_not_found', 'Variant does not belong to this comparison');
    }

    const turnstileVerified = await this.turnstileVerifier.verify(input.turnstileToken);
    const rateLimited = await this.rateLimiter.isRateLimited(input.userId, input.comparisonId);
    ensureVotingAllowed({ turnstileVerified, hasExceededRateLimit: rateLimited });

    const idempotencyKey = `${input.comparisonId}:${input.userId}`;
    const now = new Date();

    const session = VoteSession.create({
      id: crypto.randomUUID(),
      comparisonId: input.comparisonId,
      userId: input.userId,
      idempotencyKey,
      variantId: input.variantId,
      comment: input.comment ?? null,
      turnstileVerified,
      createdAt: now,
    });

    const existingSession = await this.voteSessionRepository.createWithIdempotency(session);
    if (existingSession) {
      throw new DomainError('duplicate_vote', 'You have already voted on this comparison');
    }

    const vote = Vote.create({
      id: crypto.randomUUID(),
      voteSessionId: session.id,
      comparisonId: input.comparisonId,
      variantId: input.variantId,
      comment: input.comment ?? null,
      createdAt: now,
    });
    await this.voteRepository.save(vote);

    const event: VoteSubmittedEvent = {
      id: crypto.randomUUID(),
      type: 'VoteSubmitted',
      occurredAt: now,
      payload: {
        voteId: vote.id,
        comparisonId: input.comparisonId,
        variantId: input.variantId,
        userId: input.userId,
        submittedAt: now,
      },
    };
    await this.eventBus.publish(event);

    return { vote, session };
  }
}

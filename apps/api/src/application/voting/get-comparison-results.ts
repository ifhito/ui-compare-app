import { VoteRepository } from '../../domain/voting/repositories/vote-repository';
import { DomainError } from '../errors';
import { UUID } from '../../domain/shared/types';
import { ComparisonRepository } from '../../domain/comparison/repositories/comparison-repository';

export interface VariantResult {
  variantId: string;
  votes: number;
  percentage: number;
}

export interface VoteCommentSummary {
  variantId: string;
  comment: string | null;
  createdAt: Date;
}

export interface ComparisonResults {
  comparisonId: string;
  totalVotes: number;
  breakdown: VariantResult[];
  comments: VoteCommentSummary[];
}

export class GetComparisonResultsQuery {
  constructor(
    private readonly comparisonRepository: ComparisonRepository,
    private readonly voteRepository: VoteRepository,
  ) {}

  async execute(comparisonId: UUID): Promise<ComparisonResults> {
    const comparison = await this.comparisonRepository.findById(comparisonId);
    if (!comparison) {
      throw new DomainError('comparison_not_found', 'Comparison not found');
    }

    const totalVotes = await this.voteRepository.countByComparison(comparisonId);
    const breakdownCounts = await this.voteRepository.countByVariant(comparisonId);

    const breakdown: VariantResult[] = comparison.variants.map((variant) => {
      const votes = breakdownCounts[variant.id] ?? 0;
      const percentage = totalVotes === 0 ? 0 : (votes / totalVotes) * 100;
      return {
        variantId: variant.id,
        votes,
        percentage,
      };
    });

    const comments = await this.voteRepository.listRecent(comparisonId, 10);
    const commentSummaries: VoteCommentSummary[] = comments.map((vote) => ({
      variantId: vote.variantId,
      comment: vote.comment ?? null,
      createdAt: vote.createdAt,
    }));

    return {
      comparisonId,
      totalVotes,
      breakdown,
      comments: commentSummaries,
    };
  }
}

import { ComparisonRepository } from '../../domain/comparison/repositories/comparison-repository';
import { UUID } from '../../domain/shared/types';

export interface MyComparisonSummary {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'closed';
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class GetMyComparisonsQuery {
  constructor(private readonly comparisonRepository: ComparisonRepository) {}

  async execute(ownerId: UUID): Promise<MyComparisonSummary[]> {
    const comparisons = await this.comparisonRepository.listByOwner(ownerId);
    return comparisons.map((comparison) => ({
      id: comparison.id,
      title: comparison.title,
      status: comparison.status,
      publishedAt: comparison.publishedAt ?? null,
      expiresAt: comparison.expiresAt ?? null,
      createdAt: comparison.createdAt,
      updatedAt: comparison.updatedAt,
    }));
  }
}

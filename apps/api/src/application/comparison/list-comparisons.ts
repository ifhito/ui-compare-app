import { ComparisonRepository } from '../../domain/comparison/repositories/comparison-repository';
import { Comparison } from '../../domain/comparison/entities/comparison';

export interface ListComparisonsInput {
  limit?: number;
  offset?: number;
}

export interface ComparisonSummary {
  id: string;
  title: string;
  summary: string;
  status: 'draft' | 'published' | 'closed';
  tags: string[];
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ListComparisonsQuery {
  constructor(private readonly comparisonRepository: ComparisonRepository) {}

  async execute(input: ListComparisonsInput = {}): Promise<ComparisonSummary[]> {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const offset = Math.max(input.offset ?? 0, 0);
    const comparisons = await this.comparisonRepository.findPublished(limit, offset);
    return comparisons.map(this.toSummary);
  }

  private toSummary(comparison: Comparison): ComparisonSummary {
    return {
      id: comparison.id,
      title: comparison.title,
      summary: comparison.summary,
      status: comparison.status,
      tags: comparison.tags,
      publishedAt: comparison.publishedAt ?? null,
      expiresAt: comparison.expiresAt ?? null,
      createdAt: comparison.createdAt,
      updatedAt: comparison.updatedAt,
    };
  }
}

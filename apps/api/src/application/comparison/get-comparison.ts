import { ComparisonRepository } from '../../domain/comparison/repositories/comparison-repository';
import { DomainError } from '../errors';
import { UUID } from '../../domain/shared/types';
import { UiVariant } from '../../domain/comparison/value-objects/ui-variant';

export interface ComparisonDetailVariant {
  id: string;
  label: string;
  stackblitzUrl: string;
  thumbnailUrl: string | null;
  displayOrder: number;
  createdAt: Date;
}

export interface ComparisonDetail {
  id: string;
  ownerId: string;
  title: string;
  summary: string;
  status: 'draft' | 'published' | 'closed';
  tags: string[];
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  variants: ComparisonDetailVariant[];
}

export class GetComparisonQuery {
  constructor(private readonly comparisonRepository: ComparisonRepository) {}

  async execute(id: UUID): Promise<ComparisonDetail> {
    const comparison = await this.comparisonRepository.findById(id);
    if (!comparison) {
      throw new DomainError('comparison_not_found', 'Comparison not found');
    }

    return {
      id: comparison.id,
      ownerId: comparison.ownerId,
      title: comparison.title,
      summary: comparison.summary,
      status: comparison.status,
      tags: comparison.tags,
      publishedAt: comparison.publishedAt ?? null,
      expiresAt: comparison.expiresAt ?? null,
      createdAt: comparison.createdAt,
      updatedAt: comparison.updatedAt,
      variants: comparison.variants.map((variant: UiVariant) => ({
        id: variant.id,
        label: variant.label,
        stackblitzUrl: variant.stackblitzUrl,
        thumbnailUrl: variant.thumbnailUrl ?? null,
        displayOrder: variant.displayOrder,
        createdAt: variant.createdAt,
      })),
    };
  }
}

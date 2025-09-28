import { Comparison } from '../../domain/comparison/entities/comparison';
import { ComparisonRepository } from '../../domain/comparison/repositories/comparison-repository';
import { UiVariant } from '../../domain/comparison/value-objects/ui-variant';
import { DomainError } from '../errors';
import { UUID } from '../../domain/shared/types';

export interface UpdateComparisonInput {
  id: UUID;
  ownerId: UUID;
  title?: string;
  summary?: string;
  tags?: string[];
  variants?: Array<{
    id: UUID;
    label: string;
    stackblitzUrl: string;
    thumbnailUrl?: string | null;
    displayOrder: number;
    createdAt: Date;
  }>;
}

export class UpdateComparisonCommand {
  constructor(private readonly comparisonRepository: ComparisonRepository) {}

  async execute(input: UpdateComparisonInput) {
    const comparison = await this.comparisonRepository.findById(input.id);
    if (!comparison) {
      throw new DomainError('comparison_not_found', 'Comparison not found');
    }
    if (comparison.ownerId !== input.ownerId) {
      throw new DomainError('forbidden', 'You do not own this comparison');
    }

    const updated = Comparison.create({
      id: comparison.id,
      ownerId: comparison.ownerId,
      title: input.title ?? comparison.title,
      summary: input.summary ?? comparison.summary,
      status: comparison.status,
      tags: input.tags ?? comparison.tags,
      publishedAt: comparison.publishedAt,
      expiresAt: comparison.expiresAt,
      createdAt: comparison.createdAt,
      updatedAt: new Date(),
      variants: (input.variants ?? comparison.variants.map((variant) => variant.toJSON())).map((variant) =>
        UiVariant.create({
          ...variant,
          thumbnailUrl: variant.thumbnailUrl ?? null,
        }),
      ),
    });

    await this.comparisonRepository.save(updated);
    return updated;
  }
}

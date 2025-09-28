import { Comparison } from '../../domain/comparison/entities/comparison';
import { ComparisonRepository } from '../../domain/comparison/repositories/comparison-repository';
import { UiVariant } from '../../domain/comparison/value-objects/ui-variant';
import { UUID } from '../../domain/shared/types';

export interface CreateComparisonInput {
  id: UUID;
  ownerId: UUID;
  title: string;
  summary: string;
  tags: string[];
  variants: Array<{
    id: UUID;
    label: string;
    stackblitzUrl: string;
    thumbnailUrl?: string | null;
    displayOrder: number;
    createdAt: Date;
  }>;
}

export class CreateComparisonCommand {
  constructor(private readonly comparisonRepository: ComparisonRepository) {}

  async execute(input: CreateComparisonInput) {
    const variants = input.variants.map((variant) => UiVariant.create({ ...variant }));
    const now = new Date();
    const comparison = Comparison.create({
      id: input.id,
      ownerId: input.ownerId,
      title: input.title,
      summary: input.summary,
      status: 'draft',
      tags: input.tags,
      createdAt: now,
      updatedAt: now,
      variants,
    });

    await this.comparisonRepository.save(comparison);
    return comparison;
  }
}

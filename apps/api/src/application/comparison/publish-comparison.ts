import { ComparisonRepository } from '../../domain/comparison/repositories/comparison-repository';
import { DomainError } from '../errors';
import { UUID } from '../../domain/shared/types';
import { ComparisonPublishedEvent } from '../../domain/comparison/events/comparison-published';
import { EventBus } from '../shared/event-bus';
import { UiVariant } from '../../domain/comparison/value-objects/ui-variant';

export interface PublishComparisonInput {
  id: UUID;
  ownerId: UUID;
  expiresAt?: Date | null;
}

export class PublishComparisonCommand {
  constructor(
    private readonly comparisonRepository: ComparisonRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: PublishComparisonInput) {
    const comparison = await this.comparisonRepository.findById(input.id);
    if (!comparison) {
      throw new DomainError('comparison_not_found', 'Comparison not found');
    }
    if (comparison.ownerId !== input.ownerId) {
      throw new DomainError('forbidden', 'You do not own this comparison');
    }
    if (comparison.status !== 'draft') {
      throw new DomainError('invalid_state', 'Only draft comparisons can be published');
    }

    const now = new Date();
    const updated = Comparison.create({
      id: comparison.id,
      ownerId: comparison.ownerId,
      title: comparison.title,
      summary: comparison.summary,
      status: 'published',
      tags: comparison.tags,
      createdAt: comparison.createdAt,
      updatedAt: now,
      publishedAt: now,
      expiresAt: input.expiresAt ?? comparison.expiresAt,
      variants: comparison.variants.map((variant) => UiVariant.create(variant.toJSON()))
    });

    await this.comparisonRepository.save(updated);

    const event: ComparisonPublishedEvent = {
      id: crypto.randomUUID(),
      type: 'ComparisonPublished',
      occurredAt: now,
      payload: {
        comparisonId: updated.id,
        publishedAt: now,
      },
    };
    await this.eventBus.publish(event);

    return updated;
  }
}

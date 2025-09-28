import { UUID } from '../../shared/types';
import { UiVariant } from '../value-objects/ui-variant';

export interface ComparisonProps {
  id: UUID;
  ownerId: UUID;
  title: string;
  summary: string;
  status: 'draft' | 'published' | 'closed';
  tags: string[];
  publishedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  variants: UiVariant[];
}

export class Comparison {
  private constructor(private props: ComparisonProps) {}

  static create(props: ComparisonProps): Comparison {
    const variantCount = props.variants.length;
    if (variantCount < 2 || variantCount > 4) {
      throw new Error('Comparison must have between 2 and 4 variants');
    }

    const orders = new Set(props.variants.map((variant) => variant.displayOrder));
    if (orders.size !== variantCount) {
      throw new Error('Variant display order must be unique');
    }

    return new Comparison({
      ...props,
      tags: props.tags ?? [],
      publishedAt: props.publishedAt ?? null,
      expiresAt: props.expiresAt ?? null,
    });
  }

  get id() {
    return this.props.id;
  }

  get ownerId() {
    return this.props.ownerId;
  }

  get title() {
    return this.props.title;
  }

  get summary() {
    return this.props.summary;
  }

  get status() {
    return this.props.status;
  }

  get tags() {
    return this.props.tags;
  }

  get publishedAt() {
    return this.props.publishedAt;
  }

  get expiresAt() {
    return this.props.expiresAt;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  get variants() {
    return this.props.variants;
  }

  publish(at: Date) {
    if (this.props.status !== 'draft') {
      throw new Error('Only draft comparisons can be published');
    }
    this.props.status = 'published';
    this.props.publishedAt = at;
    this.props.updatedAt = at;
  }

  close(at: Date) {
    this.props.status = 'closed';
    this.props.updatedAt = at;
  }
}

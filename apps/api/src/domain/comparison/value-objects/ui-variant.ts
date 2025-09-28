import { UUID } from '../../shared/types';

export interface UiVariantProps {
  id: UUID;
  label: string;
  stackblitzUrl: string;
  thumbnailUrl?: string | null;
  displayOrder: number;
  createdAt: Date;
}

export class UiVariant {
  private constructor(private readonly props: UiVariantProps) {}

  static create(props: UiVariantProps): UiVariant {
    if (!props.label.trim()) {
      throw new Error('Variant label cannot be empty');
    }
    try {
      // Will throw if invalid URL
      new URL(props.stackblitzUrl);
    } catch {
      throw new Error('Invalid StackBlitz URL');
    }
    return new UiVariant({ ...props, thumbnailUrl: props.thumbnailUrl ?? null });
  }

  get id() {
    return this.props.id;
  }

  get label() {
    return this.props.label;
  }

  get stackblitzUrl() {
    return this.props.stackblitzUrl;
  }

  get thumbnailUrl() {
    return this.props.thumbnailUrl;
  }

  get displayOrder() {
    return this.props.displayOrder;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  toJSON() {
    return { ...this.props };
  }
}

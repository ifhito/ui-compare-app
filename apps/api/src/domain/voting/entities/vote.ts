import { UUID } from '../../shared/types';

export interface VoteProps {
  id: UUID;
  voteSessionId: UUID;
  comparisonId: UUID;
  variantId: UUID;
  comment?: string | null;
  createdAt: Date;
}

export class Vote {
  private constructor(private props: VoteProps) {}

  static create(props: VoteProps): Vote {
    return new Vote({ ...props, comment: props.comment ?? null });
  }

  get id() {
    return this.props.id;
  }

  get voteSessionId() {
    return this.props.voteSessionId;
  }

  get comparisonId() {
    return this.props.comparisonId;
  }

  get variantId() {
    return this.props.variantId;
  }

  get comment() {
    return this.props.comment;
  }

  get createdAt() {
    return this.props.createdAt;
  }
}

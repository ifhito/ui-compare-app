import { UUID } from '../../shared/types';
export interface VoteSessionProps {
  id: UUID;
  comparisonId: UUID;
  userId: UUID;
  idempotencyKey: string;
  turnstileVerified: boolean;
  createdAt: Date;
}

export class VoteSession {
  private constructor(private props: VoteSessionProps) {}

  static create(props: VoteSessionProps): VoteSession {
    if (!props.idempotencyKey.trim()) {
      throw new Error('idempotencyKey is required');
    }
    return new VoteSession({ ...props });
  }

  get id() {
    return this.props.id;
  }

  get comparisonId() {
    return this.props.comparisonId;
  }

  get userId() {
    return this.props.userId;
  }

  get idempotencyKey() {
    return this.props.idempotencyKey;
  }

  get turnstileVerified() {
    return this.props.turnstileVerified;
  }

  get createdAt() {
    return this.props.createdAt;
  }
}

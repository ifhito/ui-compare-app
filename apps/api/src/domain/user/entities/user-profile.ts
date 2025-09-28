import { UUID } from '../../shared/types';

export interface UserProfileProps {
  id: UUID;
  firebaseUid: string;
  displayName?: string | null;
  email?: string | null;
  role: 'viewer' | 'creator' | 'admin';
  createdAt: Date;
}

export class UserProfile {
  private constructor(private props: UserProfileProps) {}

  static create(props: UserProfileProps): UserProfile {
    return new UserProfile({
      ...props,
      displayName: props.displayName ?? null,
      email: props.email ?? null,
    });
  }

  get id() {
    return this.props.id;
  }

  get firebaseUid() {
    return this.props.firebaseUid;
  }

  get displayName() {
    return this.props.displayName;
  }

  get email() {
    return this.props.email;
  }

  get role() {
    return this.props.role;
  }

  get createdAt() {
    return this.props.createdAt;
  }
}

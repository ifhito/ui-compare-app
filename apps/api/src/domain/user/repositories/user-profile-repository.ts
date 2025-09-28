import { UserProfile } from '../entities/user-profile';

export interface UserProfileRepository {
  upsert(profile: UserProfile): Promise<void>;
  findByFirebaseUid(firebaseUid: string): Promise<UserProfile | null>;
}

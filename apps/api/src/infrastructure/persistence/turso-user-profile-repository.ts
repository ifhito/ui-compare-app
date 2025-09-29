import { Client } from '@libsql/client/web';
import { UserProfileRepository } from '../../domain/user/repositories/user-profile-repository';
import { UserProfile } from '../../domain/user/entities/user-profile';

function mapRow(row: any): UserProfile {
  return UserProfile.create({
    id: row.id as string,
    firebaseUid: row.firebase_uid as string,
    displayName: (row.display_name as string) ?? null,
    email: (row.email as string) ?? null,
    role: (row.role as string) as 'viewer' | 'creator' | 'admin',
    createdAt: new Date(row.created_at),
  });
}

export class TursoUserProfileRepository implements UserProfileRepository {
  constructor(private readonly client: Client) {}

  async upsert(profile: UserProfile): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO users (id, firebase_uid, display_name, email, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              firebase_uid = excluded.firebase_uid,
              display_name = excluded.display_name,
              email = excluded.email,
              role = excluded.role`,
      args: [
        profile.id,
        profile.firebaseUid,
        profile.displayName ?? null,
        profile.email ?? null,
        profile.role,
        profile.createdAt.toISOString(),
      ],
    });
  }

  async findByFirebaseUid(firebaseUid: string): Promise<UserProfile | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM users WHERE firebase_uid = ? LIMIT 1',
      args: [firebaseUid],
    });
    if (result.rows.length === 0) {
      return null;
    }
    return mapRow(result.rows[0]);
  }
}

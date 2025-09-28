import { Client } from '@libsql/client/web';
import { VoteSessionRepository } from '../../domain/voting/repositories/vote-session-repository';
import { VoteSession } from '../../domain/voting/entities/vote-session';
import { UUID } from '../../domain/shared/types';

function mapVoteSessionRow(row: any): VoteSession {
  return VoteSession.create({
    id: row.id as string,
    comparisonId: row.comparison_id as string,
    userId: row.user_id as string,
    idempotencyKey: row.idempotency_key as string,
    turnstileVerified: Boolean(row.turnstile_verified),
    createdAt: new Date(row.created_at),
  });
}

export class TursoVoteSessionRepository implements VoteSessionRepository {
  constructor(private readonly client: Client) {}

  async createWithIdempotency(session: VoteSession): Promise<VoteSession | null> {
    const tx = await this.client.transaction('write');
    try {
      const existing = await tx.execute({
        sql: 'SELECT * FROM vote_sessions WHERE idempotency_key = ?',
        args: [session.idempotencyKey],
      });
      if (existing.rows.length > 0) {
        await tx.commit();
        return mapVoteSessionRow(existing.rows[0]);
      }

      await tx.execute({
        sql: `INSERT INTO vote_sessions (id, comparison_id, user_id, idempotency_key, turnstile_verified, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          session.id,
          session.comparisonId,
          session.userId,
          session.idempotencyKey,
          session.turnstileVerified ? 1 : 0,
          session.createdAt.toISOString(),
        ],
      });

      await tx.commit();
      return null;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  async findByIdempotencyKey(comparisonId: UUID, userId: UUID): Promise<VoteSession | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM vote_sessions WHERE comparison_id = ? AND user_id = ?',
      args: [comparisonId, userId],
    });
    if (result.rows.length === 0) {
      return null;
    }
    return mapVoteSessionRow(result.rows[0]);
  }
}

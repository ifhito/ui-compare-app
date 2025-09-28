import { Client } from '@libsql/client/web';
import { VoteRepository } from '../../domain/voting/repositories/vote-repository';
import { Vote } from '../../domain/voting/entities/vote';
import { UUID } from '../../domain/shared/types';

function mapVoteRow(row: any): Vote {
  return Vote.create({
    id: row.id as string,
    voteSessionId: row.vote_session_id as string,
    comparisonId: row.comparison_id as string,
    variantId: row.variant_id as string,
    comment: row.comment as string | null,
    createdAt: new Date(row.created_at),
  });
}

export class TursoVoteRepository implements VoteRepository {
  constructor(private readonly client: Client) {}

  async save(vote: Vote): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO votes (id, vote_session_id, comparison_id, variant_id, comment, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        vote.id,
        vote.voteSessionId,
        vote.comparisonId,
        vote.variantId,
        vote.comment ?? null,
        vote.createdAt.toISOString(),
      ],
    });
  }

  async countByComparison(comparisonId: UUID): Promise<number> {
    const result = await this.client.execute({
      sql: 'SELECT COUNT(*) as count FROM votes WHERE comparison_id = ?',
      args: [comparisonId],
    });
    const row = result.rows[0];
    return Number(row.count ?? 0);
  }

  async countByVariant(comparisonId: UUID): Promise<Record<string, number>> {
    const result = await this.client.execute({
      sql: 'SELECT variant_id, COUNT(*) as count FROM votes WHERE comparison_id = ? GROUP BY variant_id',
      args: [comparisonId],
    });
    const counts: Record<string, number> = {};
    for (const row of result.rows) {
      counts[row.variant_id as string] = Number(row.count ?? 0);
    }
    return counts;
  }

  async listRecent(comparisonId: UUID, limit: number): Promise<Vote[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM votes WHERE comparison_id = ? ORDER BY created_at DESC LIMIT ?',
      args: [comparisonId, limit],
    });
    return result.rows.map(mapVoteRow);
  }
}

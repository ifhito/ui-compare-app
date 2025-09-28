import { Client } from '@libsql/client/web';
import { ComparisonRepository } from '../../domain/comparison/repositories/comparison-repository';
import { Comparison } from '../../domain/comparison/entities/comparison';
import { UiVariant } from '../../domain/comparison/value-objects/ui-variant';

function mapComparisonRow(row: any, variants: UiVariant[]): Comparison {
  return Comparison.create({
    id: row.id as string,
    ownerId: row.owner_id as string,
    title: row.title as string,
    summary: row.summary as string,
    status: row.status as 'draft' | 'published' | 'closed',
    tags: [],
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    variants,
  });
}

function mapVariantRows(rows: any[]): UiVariant[] {
  return rows.map((row) =>
    UiVariant.create({
      id: row.id as string,
      label: row.label as string,
      stackblitzUrl: row.stackblitz_url as string,
      thumbnailUrl: (row.thumbnail_url as string) ?? null,
      displayOrder: Number(row.display_order),
      createdAt: new Date(row.created_at),
    }),
  );
}

export class TursoComparisonRepository implements ComparisonRepository {
  constructor(private readonly client: Client) {}

  async save(comparison: Comparison): Promise<void> {
    const tx = await this.client.transaction('write');
    try {
      await tx.execute({
        sql: `INSERT INTO comparisons (id, owner_id, title, summary, status, published_at, expires_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                owner_id=excluded.owner_id,
                title=excluded.title,
                summary=excluded.summary,
                status=excluded.status,
                published_at=excluded.published_at,
                expires_at=excluded.expires_at,
                created_at=excluded.created_at,
                updated_at=excluded.updated_at`,
        args: [
          comparison.id,
          comparison.ownerId,
          comparison.title,
          comparison.summary,
          comparison.status,
          comparison.publishedAt ? comparison.publishedAt.toISOString() : null,
          comparison.expiresAt ? comparison.expiresAt.toISOString() : null,
          comparison.createdAt.toISOString(),
          comparison.updatedAt.toISOString(),
        ],
      });

      await tx.execute({
        sql: 'DELETE FROM comparison_variants WHERE comparison_id = ?',
        args: [comparison.id],
      });

      for (const variant of comparison.variants) {
        await tx.execute({
          sql: `INSERT INTO comparison_variants (id, comparison_id, label, stackblitz_url, thumbnail_url, display_order, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            variant.id,
            comparison.id,
            variant.label,
            variant.stackblitzUrl,
            variant.thumbnailUrl ?? null,
            variant.displayOrder,
            variant.createdAt.toISOString(),
          ],
        });
      }

      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  async findById(id: string): Promise<Comparison | null> {
    const comparisonRes = await this.client.execute({
      sql: 'SELECT * FROM comparisons WHERE id = ?',
      args: [id],
    });

    if (comparisonRes.rows.length === 0) {
      return null;
    }

    const variantRes = await this.client.execute({
      sql: 'SELECT * FROM comparison_variants WHERE comparison_id = ? ORDER BY display_order',
      args: [id],
    });

    const comparisonRow = comparisonRes.rows[0];
    const variants = mapVariantRows(variantRes.rows);
    return mapComparisonRow(comparisonRow, variants);
  }

  async findPublished(limit: number, offset: number): Promise<Comparison[]> {
    const result = await this.client.execute({
      sql: `SELECT * FROM comparisons
            WHERE status = 'published'
            ORDER BY published_at DESC
            LIMIT ? OFFSET ?`,
      args: [limit, offset],
    });

    const comparisons: Comparison[] = [];
    for (const row of result.rows) {
      const variantsRes = await this.client.execute({
        sql: 'SELECT * FROM comparison_variants WHERE comparison_id = ? ORDER BY display_order',
        args: [row.id],
      });
      comparisons.push(mapComparisonRow(row, mapVariantRows(variantsRes.rows)));
    }
    return comparisons;
  }

  async listByOwner(ownerId: string): Promise<Comparison[]> {
    const result = await this.client.execute({
      sql: `SELECT * FROM comparisons
            WHERE owner_id = ?
            ORDER BY created_at DESC`,
      args: [ownerId],
    });

    const comparisons: Comparison[] = [];
    for (const row of result.rows) {
      const variantsRes = await this.client.execute({
        sql: 'SELECT * FROM comparison_variants WHERE comparison_id = ? ORDER BY display_order',
        args: [row.id],
      });
      comparisons.push(mapComparisonRow(row, mapVariantRows(variantsRes.rows)));
    }
    return comparisons;
  }
}

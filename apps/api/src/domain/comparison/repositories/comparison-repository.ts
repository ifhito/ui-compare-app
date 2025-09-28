import { Comparison } from '../entities/comparison';
import { UUID } from '../../shared/types';

export interface ComparisonRepository {
  save(comparison: Comparison): Promise<void>;
  findById(id: UUID): Promise<Comparison | null>;
  findPublished(limit: number, offset: number): Promise<Comparison[]>;
  listByOwner(ownerId: UUID): Promise<Comparison[]>;
}

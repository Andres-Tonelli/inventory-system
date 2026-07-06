import { Criteria } from '../criteria/criteria';

export interface Repository<T> {
  save(entity: T): Promise<void>;
  findById(id: number): Promise<T | null>;
  search(criteria: Criteria): Promise<T[]>;
  delete(id: number): Promise<void>;
}

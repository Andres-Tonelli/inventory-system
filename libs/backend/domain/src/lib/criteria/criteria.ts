export interface Filter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'in';
  value: any;
}

export interface Sort {
  field: string;
  order: 'asc' | 'desc';
}

export class Criteria {
  constructor(
    public readonly filters: Filter[] = [],
    public readonly sort?: Sort,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}

  public hasFilters(): boolean {
    return this.filters.length > 0;
  }
}

export interface PaginationResult<T> {
  docs: T[];
  total: number;
  limit: number;
  page: number;
  offset: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

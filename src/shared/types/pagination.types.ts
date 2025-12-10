/**
 * Pagination options for querying lists
 */
export type PaginationOptions = {
  limit?: number;
  page?: number;
};

/**
 * Paginated result structure
 */
export type PaginatedResult<T> = {
  docs: T[];
  total: number;
  limit: number;
  page: number;
  offset: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

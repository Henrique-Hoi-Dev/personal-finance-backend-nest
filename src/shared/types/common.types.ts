/**
 * Entity ID type (UUID string)
 */
export type EntityId = string;

/**
 * Year and month representation
 */
export type YearMonth = {
  month: number; // 1-12
  year: number; // e.g. 2025
};

/**
 * Money value in cents at the API/service layer
 * (converted from BigInt in database)
 */
export type MoneyCents = number;

/**
 * ISO 8601 date string
 */
export type DateISO = string;

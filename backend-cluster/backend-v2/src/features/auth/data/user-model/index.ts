/**
 * User Model - Business Logic Exports
 *
 * This index exports the core user model types and implementations.
 */

export type { User, IUserModel } from "./types";

// Export PostgreSQL implementation
export { UserPostgresModel } from "./postgres-impl";
export { users } from "./schema";

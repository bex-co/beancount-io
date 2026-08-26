// Database-agnostic user type (no mongoose dependencies)
export interface User {
  id: string; // Converted from ObjectId to string
  password?: string;
  email: string;
  ip?: string;
  avatar?: string;
  avatarUrl: string; // Virtual field
  locale: string;
  firstName?: string;
  lastName?: string;
  isBlocked: boolean;
  ledger_username: string;
  ledger_password: string;
  ledger_api_token?: string;
  createAt?: Date;
  updateAt?: Date;
  lastSeenAt?: Date;
}

// Input type for creating a new user
export interface CreateUserInput {
  password: string;
  email: string;
  ip: string;
  ledger_username: string;
  ledger_password: string;
  locale?: string;
  firstName?: string;
  lastName?: string;
}

// Input type for updating user
export interface UpdateUserInput {
  password?: string;
  email?: string;
  ip?: string;
  avatar?: string;
  locale?: string;
  firstName?: string;
  lastName?: string;
  isBlocked?: boolean;
  ledger_api_token?: string;
}

/**
 * Database executor type - represents any database connection/transaction.
 * This allows the interface to remain database-agnostic while supporting transactions.
 */
export type DbExecutor = any;

/**
 * Database-agnostic user model interface.
 *
 * IMPORTANT: This interface has ZERO database-specific type dependencies.
 * All types used are either:
 * - Primitive TypeScript types (string, boolean, number)
 * - Standard types (Promise, Array)
 * - Plain interfaces defined in this file (User, CreateUserInput, UpdateUserInput)
 *
 * This design allows the interface to be implemented with ANY database:
 * MongoDB, PostgreSQL, MySQL, SQLite, in-memory storage, etc.
 *
 * All methods now accept a DbExecutor as the first parameter to support transactions.
 * The DbExecutor can be a database connection or a transaction object.
 */
export interface IUserModel {
  getById(db: DbExecutor, id: string): Promise<User | null>;
  getByMail(db: DbExecutor, email: string): Promise<User | null>;
  getUserByUsername(db: DbExecutor, username: string): Promise<User | null>;
  create(db: DbExecutor, user: CreateUserInput): Promise<User>;

  findUserByEmailOrUsername(db: DbExecutor, keyword: string): Promise<User[]>;
  getActiveUsersWithUsername(
    db: DbExecutor,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<User[]>;

  verifyPassword(
    db: DbExecutor,
    userId: string,
    password: string,
  ): Promise<boolean>;
  deleteByUserId(db: DbExecutor, userId: string): Promise<void>;

  updateUser(
    db: DbExecutor,
    userId: string,
    user: UpdateUserInput,
  ): Promise<void>;
  updatePassword(
    db: DbExecutor,
    userId: string,
    password: string,
  ): Promise<void>;
  updateLocale(db: DbExecutor, userId: string, locale: string): Promise<void>;
  updateUsername(
    db: DbExecutor,
    userId: string,
    username: string,
  ): Promise<void>;
  updateFirstName(
    db: DbExecutor,
    userId: string,
    firstName: string,
  ): Promise<void>;
  updateLastName(
    db: DbExecutor,
    userId: string,
    lastName: string,
  ): Promise<void>;
  updateLastSeenAt(db: DbExecutor, userId: string, at: Date): Promise<void>;
  getRecentlySeenUsers(
    db: DbExecutor,
    options?: {
      sinceHours?: number;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ users: User[]; total: number }>;
  countUsers(db: DbExecutor): Promise<number>;
  getLedgerPasswordRotationCandidates(
    db: DbExecutor,
    currentVersionPrefix: string,
    limit: number,
  ): Promise<Array<{ id: string }>>;
  getByIdForUpdate(db: DbExecutor, id: string): Promise<User | null>;
  updateLedgerPassword(
    db: DbExecutor,
    userId: string,
    password: string,
  ): Promise<void>;
}

// Database-agnostic type (no mongoose dependencies)
export interface EmailToken {
  token: string;
  userId: string;
  expireAt: string;
}

// Database-agnostic interface
export interface IEmailTokenModel {
  regenerateToken(userId: string): Promise<EmailToken>;
  findOneAndDelete(token: string): Promise<EmailToken | null>;
  findOne(token: string): Promise<EmailToken | null>;
  deleteByUserId(userId: string): Promise<void>;
}

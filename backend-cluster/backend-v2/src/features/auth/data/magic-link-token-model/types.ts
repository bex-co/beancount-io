// Database-agnostic type (no mongoose dependencies)
export interface MagicLinkToken {
  id: string; // Converted from ObjectId to string
  userId: string;
  expireAt: string;
}

// Database-agnostic interface
export interface IMagicLinkTokenModel {
  regenerateToken(userId: string, expMins?: number): Promise<MagicLinkToken>;
  findOneAndDelete(id: string): Promise<MagicLinkToken | null>;
  findOne(id: string): Promise<MagicLinkToken | null>;
}

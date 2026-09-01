/**
 * TypeScript types for Beancount journal directives
 * Based on the Python schema from beancount-ledger
 */

export enum DirectiveType {
  TRANSACTION = "Transaction",
  BALANCE = "Balance",
  COMMODITY = "Commodity",
  CLOSE = "Close",
  CUSTOM = "Custom",
  DOCUMENT = "Document",
  EVENT = "Event",
  NOTE = "Note",
  OPEN = "Open",
  PAD = "Pad",
  PRICE = "Price",
}

export interface JournalAmount {
  number: string; // Decimal as string for precision
  currency: string;
}

interface JournalCost {
  number: string; // Decimal as string for precision
  currency: string;
  date: string; // ISO date string
  label?: string | null;
}

interface JournalPosition {
  units: JournalAmount;
  cost?: JournalCost | null;
}

export interface JournalPosting extends JournalPosition {
  account: string;
  units: JournalAmount;
  cost?: JournalCost | null;
  price?: JournalAmount | null;
  meta?: Record<string, unknown> | null;
  flag?: string | null;
}

interface JournalDirective {
  entry_hash: string;
  date: string; // ISO date string
  meta?: Record<string, unknown> | null;
  directive_type: DirectiveType;
}

export interface JournalTransaction extends JournalDirective {
  flag: string;
  payee?: string | null;
  narration?: string | null;
  postings: JournalPosting[];
  tags: string[];
  links: string[];
}

interface JournalBalance extends JournalDirective {
  account: string;
  diff_amount?: JournalAmount | null;
}

interface JournalCommodity extends JournalDirective {
  currency: string;
}

export interface JournalClose extends JournalDirective {
  account: string;
}

export interface JournalCustom extends JournalDirective {
  type: string;
  values: unknown[];
}

interface JournalDocument extends JournalDirective {
  filename: string;
  account: string;
  tags: string[];
  links: string[];
}

interface JournalEvent extends JournalDirective {
  type: string;
  description: string;
}

interface JournalNote extends JournalDirective {
  account: string;
  comment: string;
}

export interface JournalOpen extends JournalDirective {
  account: string;
  currencies?: string[] | null;
  booking?: string | null;
}

interface JournalPad extends JournalDirective {
  account: string;
  source_account: string;
}

interface JournalPrice extends JournalDirective {
  currency: string;
  amount: JournalAmount;
}

// Union type for all directive types
export type JournalDirectiveType =
  | JournalTransaction
  | JournalBalance
  | JournalCommodity
  | JournalClose
  | JournalCustom
  | JournalDocument
  | JournalEvent
  | JournalNote
  | JournalOpen
  | JournalPad
  | JournalPrice;

// Type guards for runtime type checking
export function isJournalTransaction(
  directive: JournalDirectiveType,
): directive is JournalTransaction {
  return directive.directive_type === DirectiveType.TRANSACTION;
}

export function isJournalClose(
  directive: JournalDirectiveType,
): directive is JournalClose {
  return directive.directive_type === DirectiveType.CLOSE;
}

export function isJournalOpen(
  directive: JournalDirectiveType,
): directive is JournalOpen {
  return directive.directive_type === DirectiveType.OPEN;
}

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

export interface JournalCost {
  number: string; // Decimal as string for precision
  currency: string;
  date: string; // ISO date string
  label?: string | null;
}

export interface JournalPosition {
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

export interface JournalDirective {
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

export interface JournalBalance extends JournalDirective {
  account: string;
  diff_amount?: JournalAmount | null;
}

export interface JournalCommodity extends JournalDirective {
  currency: string;
}

export interface JournalClose extends JournalDirective {
  account: string;
}

export interface JournalCustom extends JournalDirective {
  type: string;
  values: unknown[];
}

export interface JournalDocument extends JournalDirective {
  filename: string;
  account: string;
  tags: string[];
  links: string[];
}

export interface JournalEvent extends JournalDirective {
  type: string;
  description: string;
}

export interface JournalNote extends JournalDirective {
  account: string;
  comment: string;
}

export interface JournalOpen extends JournalDirective {
  account: string;
  currencies?: string[] | null;
  booking?: string | null;
}

export interface JournalPad extends JournalDirective {
  account: string;
  source_account: string;
}

export interface JournalPrice extends JournalDirective {
  currency: string;
  amount: JournalAmount;
}

export interface JournalTxnPosting {
  txn: JournalTransaction;
  posting: JournalPosting;
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

export function isJournalBalance(
  directive: JournalDirectiveType,
): directive is JournalBalance {
  return directive.directive_type === DirectiveType.BALANCE;
}

export function isJournalCommodity(
  directive: JournalDirectiveType,
): directive is JournalCommodity {
  return directive.directive_type === DirectiveType.COMMODITY;
}

export function isJournalClose(
  directive: JournalDirectiveType,
): directive is JournalClose {
  return directive.directive_type === DirectiveType.CLOSE;
}

export function isJournalCustom(
  directive: JournalDirectiveType,
): directive is JournalCustom {
  return directive.directive_type === DirectiveType.CUSTOM;
}

export function isJournalDocument(
  directive: JournalDirectiveType,
): directive is JournalDocument {
  return directive.directive_type === DirectiveType.DOCUMENT;
}

export function isJournalEvent(
  directive: JournalDirectiveType,
): directive is JournalEvent {
  return directive.directive_type === DirectiveType.EVENT;
}

export function isJournalNote(
  directive: JournalDirectiveType,
): directive is JournalNote {
  return directive.directive_type === DirectiveType.NOTE;
}

export function isJournalOpen(
  directive: JournalDirectiveType,
): directive is JournalOpen {
  return directive.directive_type === DirectiveType.OPEN;
}

export function isJournalPad(
  directive: JournalDirectiveType,
): directive is JournalPad {
  return directive.directive_type === DirectiveType.PAD;
}

export function isJournalPrice(
  directive: JournalDirectiveType,
): directive is JournalPrice {
  return directive.directive_type === DirectiveType.PRICE;
}

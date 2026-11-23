export type AccountDirective = {
  account: string;
  openedAt: string;
  closedAt: string | null;
  balance?: Record<string, unknown> | null;
  entryCount: number;
  referenceCount: number | null;
  entryHash: string;
  closeEntryHash: string | null;
};

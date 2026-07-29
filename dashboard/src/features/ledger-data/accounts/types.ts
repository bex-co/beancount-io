export type AccountDirective = {
  account: string;
  openedAt: string;
  closedAt: string | null;
  balance?: Record<string, unknown> | null;
  entryCount: number;
  entryHash: string;
  closeEntryHash: string | null;
};

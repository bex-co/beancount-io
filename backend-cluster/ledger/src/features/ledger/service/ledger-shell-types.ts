// Extracted from the donor branch's ledger-shell-service so the pure mappers
// (and scripts/verify-rustledger.ts) carry no service dependency. The adapted
// shell service must import these types from here.

export type ShellQueryResult = {
  resultType: "table" | "text";
  table?: {
    types: { name: string; dtype: string }[];
    rows: (string | number | boolean | Record<string, unknown>)[][];
    t?: string;
  };
  text?: {
    contents: string;
    t?: string;
  };
};

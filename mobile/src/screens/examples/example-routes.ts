import type { GuestView } from "@/common/guest/guest-state";

export const exampleRoutes = {
  home: "/examples/(tabs)",
  accounts: "/examples/(tabs)/accounts",
  reports: "/examples/(tabs)/reports",
  transactions: "/examples/(tabs)/transactions",
  files: "/examples/(tabs)/ledger",
} as const satisfies Record<GuestView, string>;

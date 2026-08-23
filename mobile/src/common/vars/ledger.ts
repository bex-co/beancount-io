import { createPersistentVar } from "@/common/apollo/persistent-var";

export const [ledgerVar, loadLedger, flushLedger] = createPersistentVar<
  string | null
>("ledgerId", null);

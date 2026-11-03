import { z } from "@/shared/zod-openapi-setup";
import {
  ENTRY_REQUEST_ID_DESCRIPTION,
  ENTRY_REQUEST_ID_MAX,
} from "@/features/ledger/utils/entry-write-idempotency";

/** Every REST entry write's optional retry key (w3/m61); null reads as absent. */
export const requestIdBody = z
  .string()
  .min(1)
  .max(ENTRY_REQUEST_ID_MAX)
  .nullish()
  .openapi({ description: ENTRY_REQUEST_ID_DESCRIPTION });

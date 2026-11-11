import { InMemoryCache } from "@apollo/client";

export const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // `EntryContext` has no id, so each (entryHash, ledgerId) is one object
        // that a second write replaces. Two documents select this field with the
        // same variables: transaction detail's adds `generated_from`, and Edit
        // Transaction's omits it (a server older than 2026-10-21 rejects the
        // field, w21/508). Replacing left the detail's document incomplete,
        // logged Apollo's "Cache data may be lost" and sent the detail back to
        // the network for data it already had (w22/031). Merging lets the two
        // selections accumulate; a field the server sends (even as null) still
        // overwrites. `common/apollo/__tests__/root-field-selections.test.ts`
        // fails when another root field gets two selections without a policy.
        getLedgerEntryContext: { merge: true },
      },
    },
  },
});

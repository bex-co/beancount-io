import { useCallback } from "react";
import { useQuery } from "@apollo/client/react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { GetLedgerErrorsDocument } from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";

type LedgerError = { message: string };

/** A snapshot of the ledger's errors, or null when they could not be read. */
export type ErrorSnapshot = readonly LedgerError[] | null;

/**
 * Errors present after a write that were not there before, compared by
 * message: an append shifts every later line number, so positions would
 * report old errors as new.
 */
function newErrors(
  before: readonly LedgerError[],
  after: readonly LedgerError[],
): LedgerError[] {
  const remaining = new Map<string, number>();
  for (const { message } of before) {
    remaining.set(message, (remaining.get(message) ?? 0) + 1);
  }
  return after.filter(({ message }) => {
    const left = remaining.get(message) ?? 0;
    if (left === 0) return true;
    remaining.set(message, left - 1);
    return false;
  });
}

/**
 * The outcome of a dashboard write, as MCP's write result already tells an
 * agent: a write can succeed and still leave the ledger failing validation
 * (a duplicate `open`, an unbalanced edit). Take a snapshot before writing;
 * after a successful write, `report` warns with the first new error and a
 * link to Errors, and returns true so the caller skips its success message.
 */
export function useWriteOutcome(ledgerId: string) {
  // The layout keeps this list current, so a snapshot costs no request:
  // read it from the cache, and fetch only when nothing has (w1/185). Every
  // ledger write drops it, so the next snapshot is fresh; `report` refetches
  // explicitly.
  const { data, refetch } = useQuery(GetLedgerErrorsDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
    fetchPolicy: "cache-first",
  });
  const router = useRouter({ warn: false });
  const { t } = useTranslations();
  const current = data?.getLedgerErrors;

  /** The errors before a write; read it before sending, not after. */
  const snapshot = useCallback((): ErrorSnapshot => current ?? null, [current]);

  const report = useCallback(
    async (before: ErrorSnapshot): Promise<boolean> => {
      if (!before || !refetch) return false;
      let after: readonly LedgerError[] | undefined;
      try {
        after = (await refetch()).data?.getLedgerErrors;
      } catch {
        return false;
      }
      const [first] = after ? newErrors(before, after) : [];
      if (!first) return false;
      const [ledgerOwner, ledgerName] = ledgerId.split("/");
      toast.warning(t("common.writeLeftErrors", { error: first.message }), {
        duration: Infinity,
        action: {
          label: t("common.viewErrors"),
          onClick: () =>
            void router?.navigate({
              to: "/ledger/$ledgerOwner/$ledgerName/errors",
              params: { ledgerOwner, ledgerName },
            }),
        },
      });
      return true;
    },
    [ledgerId, refetch, router, t],
  );

  return { snapshot, report };
}

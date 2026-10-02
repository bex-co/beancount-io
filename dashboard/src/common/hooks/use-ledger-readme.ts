import { useQuery } from "@apollo/client/react";
import { useHydrated } from "@tanstack/react-router";
import { useMemo } from "react";
import { GetLedgerFileDocument } from "@/graphql/definitions";
import {
  decodeLedgerReadme,
  type InitialLedgerReadme,
} from "@/common/lib/ledger-readme";

export function useLedgerReadme(
  ledgerId: string,
  initialReadme?: InitialLedgerReadme,
  path = "README.md",
) {
  const hydrated = useHydrated();
  const { data, loading, error } = useQuery(GetLedgerFileDocument, {
    variables: { ledgerId, path },
    fetchPolicy: "cache-first",
    // Initial rendering belongs to the settled loader snapshot. In particular,
    // a fast browser prefetch must not replace the server's fallback mid-hydration.
    skip: !hydrated,
  });
  const encodedContent = data?.getLedgerFile?.content;
  const content = useMemo(
    () => decodeLedgerReadme(encodedContent),
    [encodedContent],
  );

  if (!hydrated) {
    const ready =
      initialReadme?.ledgerId === ledgerId &&
      initialReadme.path === path &&
      initialReadme.status === "ready";
    return {
      content: ready ? initialReadme.content : null,
      loading: !ready,
    };
  }

  return {
    content: error ? null : content,
    loading,
  };
}

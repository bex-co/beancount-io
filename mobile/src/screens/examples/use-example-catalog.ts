import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GetLedgerDocument } from "@/generated-graphql/graphql";
import { EXAMPLE_IDS } from "@/common/guest/guest-state";
import {
  createGuestClient,
  guestReadFailure,
} from "@/common/guest/guest-client";

export type ExampleAvailability = "available" | "unavailable" | "connection";

/** The chooser and drawer share anonymous probes, outside the selected book's cache. */
export function useExampleCatalog(serverUrl: string) {
  const client = useMemo(() => createGuestClient(serverUrl, null), [serverUrl]);
  const [availability, setAvailability] = useState<
    ExampleAvailability[] | null
  >(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    const results = await Promise.all(
      EXAMPLE_IDS.map(async (ledgerId): Promise<ExampleAvailability> => {
        try {
          const { data } = await client.query({
            query: GetLedgerDocument,
            variables: { ledgerId },
            fetchPolicy: "network-only",
          });
          return data?.getLedger?.id === ledgerId && !data.getLedger.private
            ? "available"
            : "unavailable";
        } catch (error) {
          return guestReadFailure(
            error as Parameters<typeof guestReadFailure>[0],
          );
        }
      }),
    );
    if (current === generation.current) setAvailability(results);
  }, [client]);

  useEffect(() => {
    void refresh();
    return () => {
      generation.current += 1;
      client.stop();
      void client.clearStore();
    };
  }, [client, refresh]);

  return { availability, refresh };
}

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/overview",
)({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/ledger/$ledgerOwner/$ledgerName",
      params: {
        ledgerOwner: params.ledgerOwner,
        ledgerName: params.ledgerName,
      },
      search,
    });
  },
});

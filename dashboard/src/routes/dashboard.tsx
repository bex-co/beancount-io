import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ search }) => {
    // Redirect to /ledger with the same search params
    throw redirect({
      to: "/ledger",
      search,
    });
  },
});

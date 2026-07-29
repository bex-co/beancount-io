import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/gallery")({
  beforeLoad: ({ search }) => {
    // Redirect to /ledger-gallery with the same search params
    throw redirect({
      to: "/ledger-gallery",
      search,
    });
  },
});

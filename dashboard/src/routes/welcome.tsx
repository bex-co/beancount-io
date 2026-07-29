import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/welcome")({
  beforeLoad: ({ search }) => {
    // Redirect to /auth/welcome with the same search params
    throw redirect({
      to: "/auth/welcome",
      search,
    });
  },
});

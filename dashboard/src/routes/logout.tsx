import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/logout")({
  beforeLoad: ({ search }) => {
    // Redirect to /auth/logout with the same search params
    throw redirect({
      to: "/auth/logout",
      search,
    });
  },
});

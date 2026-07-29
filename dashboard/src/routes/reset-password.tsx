import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/reset-password")({
  beforeLoad: ({ search }) => {
    // Redirect to /auth/reset-password with the same search params
    throw redirect({
      to: "/auth/reset-password",
      search,
    });
  },
});

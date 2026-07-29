import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: ({ search }) => {
    // Redirect to /auth/forgot-password with the same search params
    throw redirect({
      to: "/auth/forgot-password",
      search,
    });
  },
});

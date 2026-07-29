import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ search }) => {
    // Redirect to /auth/login with the same search params
    throw redirect({
      to: "/auth/login",
      search,
    });
  },
});

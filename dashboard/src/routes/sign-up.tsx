import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up")({
  beforeLoad: ({ search }) => {
    // Redirect to /auth/sign-up with the same search params
    throw redirect({
      to: "/auth/sign-up",
      search,
    });
  },
});

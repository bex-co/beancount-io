import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/")({
  beforeLoad: () => {
    // Redirect to general settings by default
    throw redirect({
      to: "/settings/general",
    });
  },
});

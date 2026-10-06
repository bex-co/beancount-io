import { createFileRoute } from "@tanstack/react-router";
import { handleConsentRequesterGet } from "@/features/oauth/funcs/consent-requester";

// Server-only: the consent page reads who is asking from here (ADR 019 D4).
// Not nested under `/oauth/consent`'s component; the path only shares its
// prefix so the browser sends the interaction cookie.
export const Route = createFileRoute("/oauth/consent_/requester")({
  server: {
    handlers: {
      GET: handleConsentRequesterGet,
    },
  },
});

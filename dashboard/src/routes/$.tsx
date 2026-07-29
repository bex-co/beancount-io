import { createFileRoute } from "@tanstack/react-router";
import NotFoundPage from "@/common/root-route/not-found-page";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/$")({
  component: NotFoundPage,
  head: () =>
    createHeadMeta(
      getSEOMetadata("seo.notFound.title", "seo.notFound.description"),
    ),
});

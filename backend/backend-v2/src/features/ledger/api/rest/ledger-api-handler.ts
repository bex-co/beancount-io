import Router from "@koa/router";
import { type AppLayers } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import { registerDownloadArchiveRoute } from "./download-archive-handler";

export function setLedgerApiHandler(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  registerDownloadArchiveRoute(router, layers, config);
}

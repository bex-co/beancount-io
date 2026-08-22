import Router from "@koa/router";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import { AdminService } from "../service/admin-service";
import { registerLoginAsRoute } from "./login-as-handler";
import { registerUnblockUserRoute } from "./unblock-user-handler";
import { registerRunMigrationsRoute } from "./run-migrations-handler";
import { registerGetSignupOtpRoute } from "./get-signup-otp-handler";
import { registerListRecentUsersRoute } from "./list-recent-users-handler";
import { registerListActivePaidUsersRoute } from "./list-active-paid-users-handler";
import { registerGetStatsRoute } from "./get-stats-handler";
import { registerFixUserEmailRoute } from "./fix-user-email-handler";
import { registerGetUserDetailRoute } from "./get-user-detail-handler";
import { registerLedgerLimitsRoute } from "./ledger-limits-handler";
import { registerUserLedgersRoute } from "./user-ledgers-handler";

export function setAdminApiRoute(
  server: Router,
  layers: AppLayers,
  config: Pick<AppConfig, "dashboard">,
): void {
  const adminService = new AdminService(
    {
      user: layers.database.models.user,
      signupOtpSession: layers.database.models.signupOtpSession,
      magicLinkToken: layers.database.models.magicLinkToken,
      paidCustomer: layers.database.models.paidCustomer,
    },
    layers.database.db,
    config,
    layers.services.account,
    layers.services.stripe,
    layers.workflows.ledger,
    layers.clients.cacheHelper,
  );

  registerLoginAsRoute(server, adminService);
  registerUnblockUserRoute(server, adminService);
  registerRunMigrationsRoute(server, adminService);
  registerGetSignupOtpRoute(server, adminService);
  registerListRecentUsersRoute(server, adminService);
  registerListActivePaidUsersRoute(server, adminService);
  registerGetStatsRoute(server, adminService);
  registerFixUserEmailRoute(server, adminService);
  registerGetUserDetailRoute(server, adminService);
  registerLedgerLimitsRoute(server, adminService);
  registerUserLedgersRoute(server, adminService);
}

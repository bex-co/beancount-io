import Router from "@koa/router";
import { setHealthzHandler } from "../healthz-handler";
import type {
  DatabaseLayer,
  ClientFactoryLayer,
} from "@/foundation/composition";
import type { AppConfig } from "@/config/config";

describe("Healthz Handler", () => {
  let router: Router;
  let mockLayers: { database: DatabaseLayer; clients: ClientFactoryLayer };
  let mockConfig: AppConfig;

  beforeEach(() => {
    router = new Router();
    mockLayers = {
      database: {
        db: {} as any,
        models: {} as any,
      },
      clients: {
        cacheHelper: {} as any,
        favaClientFactory: {} as any,
        giteaClientFactory: {} as any,
        plaidClient: {} as any,
        sendgrid: {} as any,
      } as any,
    };
    mockConfig = {
      favaApi: { baseUrl: "http://ledger:8000" },
      gitea: { internalHostname: "gitea", httpPort: 3000 },
    } as AppConfig;
  });

  describe("setHealthzHandler", () => {
    it("should register GET /healthz route", () => {
      setHealthzHandler(router, mockLayers, mockConfig);

      const routes = router.stack;
      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe("/healthz");
      expect(routes[0].methods).toContain("GET");
    });
  });
});

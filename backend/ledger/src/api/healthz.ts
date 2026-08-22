import Router from "@koa/router";

export interface HealthCheck {
  status: string;
  timestamp: string;
}

export function healthCheck(): { success: true; data: HealthCheck } {
  return {
    success: true,
    data: { status: "healthy", timestamp: new Date().toISOString() },
  };
}

export function setHealthzHandler(router: Router): void {
  router.get("/healthz", (ctx) => {
    ctx.body = healthCheck();
  });
}

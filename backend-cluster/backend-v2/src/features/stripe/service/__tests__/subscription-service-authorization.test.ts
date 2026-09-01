import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import {
  AUTHORIZATION_ACTIONS,
  AuthorizationService,
  type IAuthorizationService,
} from "@/server/api/authorization";
import { setAuditSink, type AuditEvent } from "@/server/api/audit";
import type { Identity } from "@/server/api/identity";
import { asyncContext, runWithOperationId } from "@/shared/async-context";
import { ErrorCategory } from "@/shared/errors";
import type { IStripeService } from "../stripe-service";
import { SubscriptionService } from "../subscription-service";

const session: Identity = {
  userId: "usr_alice",
  method: "session",
  scopes: new Set(),
  capabilityExempt: true,
};

const oauth: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  capabilityExempt: false,
};

function makeDeps() {
  const stripe = {
    listSubscriptions: jest.fn(async () => []),
    getStripeInstance: jest.fn(),
    createCustomerPortalSession: jest.fn(async () => ({ success: true })),
    cancelSubscription: jest.fn(async () => ({ success: true })),
    resumeSubscription: jest.fn(async () => ({ success: true })),
    upgradeSubscription: jest.fn(async () => ({ success: true })),
  };
  const models = {
    user: { getById: jest.fn(async () => ({ email: "alice@example.com" })) },
    paidCustomer: {
      findByUserIdWithActivePeriod: jest.fn(async () => ({
        currentPeriodEnd: new Date(Date.now() + 60_000),
      })),
      findByUserIdAndClientId: jest.fn(async () => null),
      findByUserId: jest.fn(async () => []),
      updateCustomerById: jest.fn(),
    },
  };
  return { stripe, models };
}

function makeService(
  authorization: IAuthorizationService,
  deps = makeDeps(),
): { service: SubscriptionService; deps: ReturnType<typeof makeDeps> } {
  return {
    service: new SubscriptionService(
      deps.stripe as unknown as IStripeService,
      deps.models as unknown as Pick<IModels, "paidCustomer" | "user">,
      {} as DbExecutor,
      authorization,
    ),
    deps,
  };
}

const BILLING_CASES = [
  {
    action: AUTHORIZATION_ACTIONS.USER_BILLING_STATUS_READ,
    call: (service: SubscriptionService, identity: Identity) =>
      service.subscriptionStatus(identity, true),
  },
  {
    action: AUTHORIZATION_ACTIONS.USER_BILLING_CHECKOUT_CREATE,
    call: (service: SubscriptionService, identity: Identity) =>
      service.createSubscriptionSession(identity, "invalid-client", "price_1"),
  },
  {
    action: AUTHORIZATION_ACTIONS.USER_BILLING_PORTAL_CREATE,
    call: (service: SubscriptionService, identity: Identity) =>
      service.createStripePortalSession(identity, "beancount-web-prod"),
  },
  {
    action: AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_CANCEL,
    call: (service: SubscriptionService, identity: Identity) =>
      service.cancelSubscription(identity, "sub_1", "beancount-web-prod"),
  },
  {
    action: AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_RESUME,
    call: (service: SubscriptionService, identity: Identity) =>
      service.resumeSubscription(identity, "sub_1", "beancount-web-prod"),
  },
  {
    action: AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_UPGRADE,
    call: (service: SubscriptionService, identity: Identity) =>
      service.upgradeSubscription(identity, "beancount-web-prod", "price_1"),
  },
] as const;

function expectNoBillingWork(deps: ReturnType<typeof makeDeps>): void {
  expect(deps.stripe.listSubscriptions).not.toHaveBeenCalled();
  expect(deps.stripe.getStripeInstance).not.toHaveBeenCalled();
  expect(deps.stripe.createCustomerPortalSession).not.toHaveBeenCalled();
  expect(deps.stripe.cancelSubscription).not.toHaveBeenCalled();
  expect(deps.stripe.resumeSubscription).not.toHaveBeenCalled();
  expect(deps.stripe.upgradeSubscription).not.toHaveBeenCalled();
  expect(deps.models.user.getById).not.toHaveBeenCalled();
  expect(
    deps.models.paidCustomer.findByUserIdWithActivePeriod,
  ).not.toHaveBeenCalled();
  expect(
    deps.models.paidCustomer.findByUserIdAndClientId,
  ).not.toHaveBeenCalled();
  expect(deps.models.paidCustomer.findByUserId).not.toHaveBeenCalled();
  expect(deps.models.paidCustomer.updateCustomerById).not.toHaveBeenCalled();
}

describe("SubscriptionService authorization boundary", () => {
  afterEach(() => setAuditSink(undefined));

  it("returns the public quota catalog without a PDP decision or billing work", async () => {
    const authorizeOrThrow = jest.fn();
    const { service, deps } = makeService({ authorizeOrThrow } as never);

    await expect(service.allTierQuotas()).resolves.toHaveLength(5);

    expect(authorizeOrThrow).not.toHaveBeenCalled();
    expectNoBillingWork(deps);
  });

  it.each(BILLING_CASES)(
    "maps $action to one exact-self PDP call before billing work",
    async ({ action, call }) => {
      const authorizeOrThrow = jest.fn(async () => ({
        allowed: true as const,
      }));
      const { service } = makeService({ authorizeOrThrow } as never);

      await call(service, session);

      expect(authorizeOrThrow).toHaveBeenCalledTimes(1);
      expect(authorizeOrThrow).toHaveBeenCalledWith({
        principal: session,
        action,
        resource: "user:usr_alice",
      });
    },
  );

  it.each(BILLING_CASES)(
    "performs no billing work when $action is denied",
    async ({ call }) => {
      const authorization = new AuthorizationService({
        check: async () => true,
      });
      const { service, deps } = makeService(authorization);

      await expect(call(service, oauth)).rejects.toMatchObject({
        category: ErrorCategory.FORBIDDEN,
        message: "Managing billing requires a full signed-in session",
      });
      expectNoBillingWork(deps);
    },
  );

  it("fails closed before Stripe when the relationship source is unavailable", async () => {
    const events: AuditEvent[] = [];
    setAuditSink(async (event) => {
      events.push(event);
    });
    const authorization = new AuthorizationService({
      check: async () => {
        throw new Error("database unavailable");
      },
    });
    const { service, deps } = makeService(authorization);

    await expect(
      service.cancelSubscription(session, "sub_1", "beancount-web-prod"),
    ).rejects.toMatchObject({ category: ErrorCategory.SERVICE_UNAVAILABLE });
    expectNoBillingWork(deps);
    await new Promise((resolve) => setImmediate(resolve));
    expect(events).toEqual([
      expect.objectContaining({
        op: AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_CANCEL,
        outcome: "error",
      }),
    ]);
  });

  it("fails closed before Stripe on a relationship denial", async () => {
    const authorization = new AuthorizationService({
      check: async () => false,
    });
    const { service, deps } = makeService(authorization);

    await expect(
      service.cancelSubscription(session, "sub_1", "beancount-web-prod"),
    ).rejects.toMatchObject({ category: ErrorCategory.FORBIDDEN });
    expectNoBillingWork(deps);
  });

  it("keeps billing available when audit persistence fails", async () => {
    setAuditSink(async () => {
      throw new Error("audit database unavailable");
    });
    const authorization = new AuthorizationService({ check: async () => true });
    const { service, deps } = makeService(authorization);

    await expect(
      service.cancelSubscription(session, "sub_1", "beancount-web-prod"),
    ).resolves.toEqual({ success: true });
    expect(deps.stripe.cancelSubscription).toHaveBeenCalledTimes(1);
  });

  it("uses the canonical action when a protected service is called directly", async () => {
    const events: AuditEvent[] = [];
    setAuditSink(async (event) => {
      events.push(event);
    });
    const authorization = new AuthorizationService({ check: async () => true });
    const { service } = makeService(authorization);

    await service.cancelSubscription(session, "sub_1", "beancount-web-prod");
    await new Promise((resolve) => setImmediate(resolve));

    expect(events).toEqual([
      expect.objectContaining({
        op: AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_CANCEL,
        outcome: "allowed",
      }),
    ]);
  });

  it("audits duplicate concurrent operations independently with isolated op ids", async () => {
    const events: AuditEvent[] = [];
    setAuditSink(async (event) => {
      events.push(event);
    });
    const authorization = new AuthorizationService({ check: async () => true });
    const { service } = makeService(authorization);

    await asyncContext.run({ requestId: "req_billing" }, () =>
      Promise.all([
        runWithOperationId("GQL Mutation.cancelSubscription", () =>
          service.cancelSubscription(session, "sub_1", "beancount-web-prod"),
        ),
        runWithOperationId("GQL Mutation.resumeSubscription", () =>
          service.resumeSubscription(session, "sub_1", "beancount-web-prod"),
        ),
        runWithOperationId("GQL Mutation.cancelSubscription", () =>
          service.cancelSubscription(session, "sub_2", "beancount-web-prod"),
        ),
      ]),
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(events.map((event) => event.op)).toEqual(
      expect.arrayContaining([
        "GQL Mutation.cancelSubscription",
        "GQL Mutation.cancelSubscription",
        "GQL Mutation.resumeSubscription",
      ]),
    );
    expect(events).toHaveLength(3);
  });
});

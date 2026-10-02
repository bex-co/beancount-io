const mockCreateFavaApi = jest.fn();
const mockCreateAnonymousFavaApi = jest.fn();
jest.mock("@/foundation/fava", () => ({
  createFavaApi: (...args: unknown[]) => mockCreateFavaApi(...args),
  createAnonymousFavaApi: (...args: unknown[]) =>
    mockCreateAnonymousFavaApi(...args),
}));

const mockCreateGiteaClient = jest.fn();
const mockCreateAnonymousGiteaClient = jest.fn();
jest.mock("@/features/gitea/service/gitea-client-factory", () => ({
  createGiteaClient: (...args: unknown[]) => mockCreateGiteaClient(...args),
  createAnonymousGiteaClient: (...args: unknown[]) =>
    mockCreateAnonymousGiteaClient(...args),
}));

import { FavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { GiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import { ForbiddenError } from "@/shared/errors";

const config = {
  favaApi: {
    baseUrl: "http://ledger.internal",
    adminUser: "admin",
    adminPassword: "admin-secret",
  },
} as any;

function models() {
  return {
    user: {
      getById: jest.fn(),
      getUserByUsername: jest.fn(),
      updateUser: jest.fn(),
    },
  } as any;
}

describe("anonymous public client selection", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([undefined, null, true, 0, "", "false"])(
    "denies anonymous ledger-v2 access when private is %p",
    async (privateValue) => {
      mockCreateFavaApi.mockReturnValue({
        ledgers: {
          getLedger: jest.fn().mockResolvedValue({
            data: { success: true, data: { private: privateValue } },
          }),
        },
      });
      const factory = new FavaClientFactory(models(), {} as any, config);

      await expect(
        factory.getPublicApiClient("alice/public-ledger"),
      ).rejects.toThrow(ForbiddenError);
      expect(mockCreateAnonymousFavaApi).not.toHaveBeenCalled();
    },
  );

  it("denies anonymous ledger-v2 access when the successful body has no repo", async () => {
    mockCreateFavaApi.mockReturnValue({
      ledgers: {
        getLedger: jest.fn().mockResolvedValue({ data: { success: true } }),
      },
    });
    const factory = new FavaClientFactory(models(), {} as any, config);

    await expect(
      factory.getPublicApiClient("alice/public-ledger"),
    ).rejects.toThrow(ForbiddenError);
    expect(mockCreateAnonymousFavaApi).not.toHaveBeenCalled();
  });

  it.each([undefined, null, true, 0, "", "false"])(
    "denies anonymous Gitea access when private is %p",
    async (privateValue) => {
      mockCreateGiteaClient.mockReturnValue({
        repos: {
          repoGet: jest
            .fn()
            .mockResolvedValue({ data: { private: privateValue } }),
        },
      });
      const factory = new GiteaClientFactory(models(), {} as any, config);

      await expect(
        factory.getPublicApiClient("alice/public-ledger"),
      ).rejects.toThrow(ForbiddenError);
      expect(mockCreateAnonymousGiteaClient).not.toHaveBeenCalled();
    },
  );

  it("uses anonymous ledger-v2 access after confirming the repo is public", async () => {
    const userModels = models();
    const adminClient = {
      ledgers: {
        getLedger: jest.fn().mockResolvedValue({
          data: { success: true, data: { private: false } },
        }),
      },
    };
    const anonymousClient = { kind: "anonymous-fava" };
    mockCreateFavaApi.mockReturnValue(adminClient);
    mockCreateAnonymousFavaApi.mockReturnValue(anonymousClient);

    const factory = new FavaClientFactory(userModels, {} as any, config);
    const result = await factory.getPublicApiClient("alice/public-ledger");

    expect(result).toBe(anonymousClient);
    expect(mockCreateAnonymousFavaApi).toHaveBeenCalledWith(
      "http://ledger.internal",
    );
    expect(userModels.user.getUserByUsername).not.toHaveBeenCalled();
    expect(userModels.user.updateUser).not.toHaveBeenCalled();
  });

  it("uses anonymous Gitea access after confirming the repo is public", async () => {
    const userModels = models();
    const adminClient = {
      repos: {
        repoGet: jest.fn().mockResolvedValue({ data: { private: false } }),
      },
    };
    const anonymousClient = { kind: "anonymous-gitea" };
    mockCreateGiteaClient.mockReturnValue(adminClient);
    mockCreateAnonymousGiteaClient.mockReturnValue(anonymousClient);

    const factory = new GiteaClientFactory(userModels, {} as any, config);
    const result = await factory.getPublicApiClient("alice/public-ledger");

    expect(result).toBe(anonymousClient);
    expect(mockCreateAnonymousGiteaClient).toHaveBeenCalledTimes(1);
    expect(userModels.user.getUserByUsername).not.toHaveBeenCalled();
    expect(userModels.user.updateUser).not.toHaveBeenCalled();
  });
});

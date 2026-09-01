import { LedgerPublicKeyService } from "../ledger-public-key-service";
import {
  AUTHORIZATION_ACTIONS,
  userResource,
} from "@/server/api/authorization";

const identity = {
  userId: "usr_alice",
  method: "session",
  scopes: new Set<string>(),
} as const;

const key = {
  id: 7,
  fingerprint: "SHA256:test",
  key: "ssh-ed25519 AAAA",
  last_used_at: null,
  title: "automation",
  created_at: "2026-08-31T00:00:00Z",
};

describe("LedgerPublicKeyService authorization", () => {
  const listPublicKeys = jest.fn();
  const getPublicKey = jest.fn();
  const createPublicKey = jest.fn();
  const deletePublicKey = jest.fn();
  const getApiContext = jest.fn();
  const authorizeOrThrow = jest.fn();
  let service: LedgerPublicKeyService;

  beforeEach(() => {
    jest.clearAllMocks();
    authorizeOrThrow.mockResolvedValue({ allowed: true });
    listPublicKeys.mockResolvedValue({
      data: { success: true, data: [key] },
    });
    getPublicKey.mockResolvedValue({ data: { success: true, data: key } });
    createPublicKey.mockResolvedValue({ data: { success: true, data: key } });
    deletePublicKey.mockResolvedValue({
      data: { success: true, data: null },
    });
    getApiContext.mockResolvedValue({
      favaApiClient: {
        keys: {
          listPublicKeys,
          getPublicKey,
          createPublicKey,
          deletePublicKey,
        },
      },
    });
    service = new LedgerPublicKeyService(
      { getApiContext } as never,
      { authorizeOrThrow } as never,
    );
  });

  it.each([
    [
      AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_LIST,
      () => service.listPublicKeys(identity, { page: 2, limit: 5 }),
    ],
    [
      AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_READ,
      () => service.getPublicKey(identity, 7),
    ],
    [
      AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_CREATE,
      () =>
        service.createPublicKey(identity, {
          key: key.key,
          title: key.title,
          readOnly: true,
        }),
    ],
    [
      AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_DELETE,
      () => service.deletePublicKey(identity, 7),
    ],
  ] as const)("authorizes %s before Fava key work", async (action, invoke) => {
    await invoke();
    expect(authorizeOrThrow).toHaveBeenCalledWith({
      principal: identity,
      action,
      resource: userResource(identity.userId),
    });
    expect(authorizeOrThrow.mock.invocationCallOrder[0]).toBeLessThan(
      getApiContext.mock.invocationCallOrder[0],
    );
  });

  it("performs no Fava work when authorization is denied", async () => {
    authorizeOrThrow.mockRejectedValueOnce(new Error("denied"));
    await expect(service.deletePublicKey(identity, 7)).rejects.toThrow(
      "denied",
    );
    expect(getApiContext).not.toHaveBeenCalled();
    expect(deletePublicKey).not.toHaveBeenCalled();
  });

  it("preserves key mapping and API inputs after authorization", async () => {
    await expect(service.listPublicKeys(identity)).resolves.toEqual([
      {
        id: 7,
        fingerprint: "SHA256:test",
        key: "ssh-ed25519 AAAA",
        lastUsedAt: undefined,
        title: "automation",
        createdAt: "2026-08-31T00:00:00Z",
      },
    ]);
    await service.createPublicKey(identity, {
      key: key.key,
      title: key.title,
      readOnly: true,
    });
    expect(createPublicKey).toHaveBeenCalledWith({
      key: key.key,
      title: key.title,
      read_only: true,
    });
  });
});

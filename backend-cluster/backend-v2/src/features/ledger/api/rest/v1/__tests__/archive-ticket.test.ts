import { ForbiddenError } from "@/shared/errors";
import type { CacheHelper } from "@/shared/cache";
import {
  mintArchiveTicket,
  redeemArchiveTicket,
  TICKET_LIFETIME_MS,
} from "../archive-ticket";
import { makeFakeCache } from "@/server/rest/__tests__/v1-test-server";

/**
 * The credential that replaced `?token=<JWT>`.
 *
 * Its whole value is in what it *cannot* do, so that is what these assert: it
 * cannot be replayed, cannot outlive a minute, cannot be pointed at another
 * ledger or another archive, and cannot be forged without the server secret.
 * A ticket that merely works would be no better than the JWT it replaced.
 */

const SECRET = "server-secret";
const CLAIMS = {
  userId: "usr_alice",
  ledgerId: "alice/main",
  archive: "gitea-main.zip",
};
const TARGET = { ledgerId: CLAIMS.ledgerId, archive: CLAIMS.archive };

let cache: ReturnType<typeof makeFakeCache>;
const helper = () => cache.helper as unknown as CacheHelper;

beforeEach(() => {
  cache = makeFakeCache();
});

describe("archive download tickets", () => {
  it("redeems once and reports when it expires", async () => {
    const { ticket, expiresAt } = await mintArchiveTicket(
      CLAIMS,
      SECRET,
      helper(),
      cache.now,
    );
    expect(new Date(expiresAt).getTime()).toBe(cache.now + TICKET_LIFETIME_MS);

    await expect(
      redeemArchiveTicket(ticket, TARGET, SECRET, helper(), cache.now),
    ).resolves.toEqual({ userId: "usr_alice" });
  });

  it("refuses a replay", async () => {
    const { ticket } = await mintArchiveTicket(
      CLAIMS,
      SECRET,
      helper(),
      cache.now,
    );
    await redeemArchiveTicket(ticket, TARGET, SECRET, helper(), cache.now);

    await expect(
      redeemArchiveTicket(ticket, TARGET, SECRET, helper(), cache.now),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses after the lifetime elapses", async () => {
    const { ticket } = await mintArchiveTicket(
      CLAIMS,
      SECRET,
      helper(),
      cache.now,
    );
    cache.advance(TICKET_LIFETIME_MS + 1);

    await expect(
      redeemArchiveTicket(ticket, TARGET, SECRET, helper(), cache.now),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses a ticket aimed at another ledger", async () => {
    const { ticket } = await mintArchiveTicket(
      CLAIMS,
      SECRET,
      helper(),
      cache.now,
    );

    await expect(
      redeemArchiveTicket(
        ticket,
        { ledgerId: "bob/main", archive: CLAIMS.archive },
        SECRET,
        helper(),
        cache.now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses a ticket aimed at another archive", async () => {
    const { ticket } = await mintArchiveTicket(
      CLAIMS,
      SECRET,
      helper(),
      cache.now,
    );

    await expect(
      redeemArchiveTicket(
        ticket,
        { ledgerId: CLAIMS.ledgerId, archive: "gitea-secret.zip" },
        SECRET,
        helper(),
        cache.now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses a ticket signed with a different secret", async () => {
    const { ticket } = await mintArchiveTicket(
      CLAIMS,
      "someone-elses-secret",
      helper(),
      cache.now,
    );

    await expect(
      redeemArchiveTicket(ticket, TARGET, SECRET, helper(), cache.now),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses a payload edited after signing", async () => {
    const { ticket } = await mintArchiveTicket(
      CLAIMS,
      SECRET,
      helper(),
      cache.now,
    );
    const [version, body, signature] = ticket.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const forged = Buffer.from(
      JSON.stringify({ ...payload, ledgerId: "bob/main" }),
      "utf8",
    ).toString("base64url");

    await expect(
      redeemArchiveTicket(
        `${version}.${forged}.${signature}`,
        { ledgerId: "bob/main", archive: CLAIMS.archive },
        SECRET,
        helper(),
        cache.now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it.each([["not-a-ticket"], ["v1.only-two-parts"], [""], ["v2.a.b"]])(
    "refuses the malformed ticket %p",
    async (ticket) => {
      await expect(
        redeemArchiveTicket(ticket, TARGET, SECRET, helper(), cache.now),
      ).rejects.toBeInstanceOf(ForbiddenError);
    },
  );

  it("leaves no nonce behind once redeemed", async () => {
    const { ticket } = await mintArchiveTicket(
      CLAIMS,
      SECRET,
      helper(),
      cache.now,
    );
    expect(cache.size()).toBe(1);
    await redeemArchiveTicket(ticket, TARGET, SECRET, helper(), cache.now);
    expect(cache.size()).toBe(0);
  });

  it("says the same thing however it refuses", async () => {
    const errors: string[] = [];
    for (const attempt of ["not-a-ticket", "v1.aaa.bbb"]) {
      await redeemArchiveTicket(
        attempt,
        TARGET,
        SECRET,
        helper(),
        cache.now,
      ).catch((err: Error) => errors.push(err.message));
    }
    // A caller learning *why* a ticket failed learns something about tickets
    // it did not mint. Both refusals read identically.
    expect(new Set(errors).size).toBe(1);
  });
});

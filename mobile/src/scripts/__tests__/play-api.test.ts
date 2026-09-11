import { createHash, generateKeyPairSync, verify } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { createPlayClient, pullPlayBaseline } from "../play-api";
import { applyPlayPlan, playBaselineDigest } from "../play-release";

describe("Google Play baseline", () => {
  let directory: string;
  let credentialPath: string;
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  beforeEach(() => {
    fs.mkdirSync("tmp", { recursive: true });
    directory = fs.mkdtempSync(path.join("tmp", "play-api-test-"));
    credentialPath = path.join(directory, "credential.json");
    fs.writeFileSync(
      credentialPath,
      JSON.stringify({
        type: "service_account",
        client_email: "test@example.invalid",
        private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
        token_uri: "https://untrusted.invalid/never-send-credentials",
      }),
    );
  });

  afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

  it("signs a scoped JWT for Google's fixed token endpoint", async () => {
    const request: typeof fetch = async (url, options) => {
      expect(url).toBe("https://oauth2.googleapis.com/token");
      expect(options?.redirect).toBe("error");
      const assertion = (options?.body as URLSearchParams).get("assertion")!;
      const [header, payload, signature] = assertion.split(".");
      const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
      expect(claims.scope).toBe(
        "https://www.googleapis.com/auth/androidpublisher",
      );
      expect(claims.aud).toBe(url);
      expect(claims.exp - claims.iat).toBe(3600);
      expect(
        verify(
          "RSA-SHA256",
          Buffer.from(`${header}.${payload}`),
          publicKey,
          Buffer.from(signature, "base64url"),
        ),
      ).toBe(true);
      return Response.json({ access_token: "fake-token" });
    };
    await createPlayClient(credentialPath, request);
  });

  it("records public listing and image fields and deletes the uncommitted edit", async () => {
    const calls: string[] = [];
    const request: typeof fetch = async (url, options) => {
      const address = String(url);
      calls.push(`${options?.method} ${address}`);
      if (address.endsWith("/token"))
        return Response.json({ access_token: "fake-token" });
      expect((options?.headers as Record<string, string>).Authorization).toBe(
        "Bearer fake-token",
      );
      if (options?.method === "POST") return Response.json({ id: "edit-1" });
      if (options?.method === "DELETE")
        return new Response(null, { status: 204 });
      if (address.endsWith("/listings"))
        return Response.json({
          listings: [
            {
              language: "bg",
              title: "Заглавие",
              shortDescription: "Кратко",
              fullDescription: "Описание",
              private_key: "must-not-be-recorded",
            },
          ],
        });
      return Response.json({
        images: [
          {
            id: "image",
            url: "https://example.invalid/image",
            sha256: "hash",
            access_token: "must-not-be-recorded",
          },
        ],
      });
    };
    const baseline = await pullPlayBaseline(
      await createPlayClient(credentialPath, request),
    );
    expect(baseline.packageName).toBe("io.beancount.android");
    expect(baseline.listings[0].language).toBe("bg");
    expect(baseline.listings[0].images.phoneScreenshots.length).toBe(1);
    expect(baseline.listings[0].images.featureGraphic[0].sha256).toBe("hash");
    expect(JSON.stringify(baseline).includes("must-not-be-recorded")).toBe(
      false,
    );
    expect(calls[calls.length - 1]).toBe(
      "DELETE https://androidpublisher.googleapis.com/androidpublisher/v3/applications/io.beancount.android/edits/edit-1",
    );
    expect(calls.some((call) => call.includes(":commit"))).toBe(false);
  });

  it("redacts OAuth response bodies and network diagnostics", async () => {
    for (const networkFailure of [false, true]) {
      const request: typeof fetch = async () => {
        if (networkFailure)
          throw new Error("Authorization: Bearer secret-token");
        return Response.json({ error: "secret-assertion" }, { status: 403 });
      };
      let message = "";
      try {
        await createPlayClient(credentialPath, request);
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toBe(
        networkFailure
          ? "Google Play request failed (network or timeout)."
          : "Google Play request failed (HTTP 403).",
      );
    }
  });

  it("deletes the edit when reading listings fails", async () => {
    const calls: string[] = [];
    const request: typeof fetch = async (url, options) => {
      calls.push(options?.method ?? "GET");
      if (String(url).endsWith("/token"))
        return Response.json({ access_token: "fake-token" });
      if (options?.method === "POST") return Response.json({ id: "edit-1" });
      if (options?.method === "DELETE")
        return new Response(null, { status: 204 });
      return Response.json({ error: "private diagnostic" }, { status: 403 });
    };
    let message = "";
    try {
      await pullPlayBaseline(await createPlayClient(credentialPath, request));
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toBe("Google Play request failed (HTTP 403).");
    expect(calls[calls.length - 1]).toBe("DELETE");
  });

  it("uploads in order and commits only after validation, abandoning failed edits", async () => {
    const png = Buffer.from("test-image-bytes");
    fs.writeFileSync(path.join(directory, "phone.png"), png);
    const baseline = {
      packageName: "io.beancount.android",
      capturedAt: "2026-09-08",
      listings: [],
    };
    const plan = {
      version: "1.20260906.47",
      baselineDigest: playBaselineDigest(baseline),
      locales: [
        {
          before: null,
          after: {
            language: "bg",
            title: "Заглавие",
            shortDescription: "Кратко",
            fullDescription: "Описание",
          },
          images: {
            phoneScreenshots: [
              {
                file: "phone.png",
                sha256: createHash("sha256").update(png).digest("hex"),
              },
            ],
          },
        },
      ],
    };
    for (const failure of ["none", "validation", "remote-drift"]) {
      const calls: string[] = [];
      const request: typeof fetch = async (url, options) => {
        const address = String(url);
        if (address.endsWith("/token"))
          return Response.json({ access_token: "fake-token" });
        const suffix = address.split("/edits")[1];
        calls.push(`${options?.method} ${suffix}`);
        if (suffix === "") return Response.json({ id: "edit-1" });
        if (suffix.endsWith("/listings"))
          return Response.json({ listings: [] });
        if (suffix.includes("uploadType=media")) {
          expect(address.includes("/upload/androidpublisher/v3/")).toBe(true);
          expect(Buffer.from(options?.body as Uint8Array).equals(png)).toBe(
            true,
          );
        }
        if (suffix.endsWith(":validate") && failure === "validation")
          return Response.json({ error: "not-valid" }, { status: 400 });
        if (options?.method === "DELETE")
          return new Response(null, { status: 204 });
        return Response.json({});
      };
      let error = "";
      try {
        await applyPlayPlan(
          await createPlayClient(credentialPath, request),
          directory,
          {
            ...plan,
            baselineDigest:
              failure === "remote-drift" ? "stale" : plan.baselineDigest,
          },
        );
      } catch (caught) {
        error = (caught as Error).message;
      }
      if (failure === "none") {
        expect(error).toBe("");
        expect(calls.slice(-5)).toEqual([
          "PUT /edit-1/listings/bg",
          "DELETE /edit-1/listings/bg/phoneScreenshots",
          "POST /edit-1/listings/bg/phoneScreenshots?uploadType=media",
          "POST /edit-1:validate",
          "POST /edit-1:commit?changesInReviewBehavior=ERROR_IF_IN_REVIEW",
        ]);
      } else {
        expect(error.length > 0).toBe(true);
        expect(calls.some((call) => call.includes(":commit"))).toBe(false);
        expect(calls[calls.length - 1]).toBe("DELETE /edit-1");
        if (failure === "remote-drift")
          expect(calls.some((call) => call.startsWith("PUT"))).toBe(false);
      }
    }
  });
});

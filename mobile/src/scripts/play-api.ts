import { createSign } from "crypto";
import { readFileSync } from "fs";

const PACKAGE_NAME = "io.beancount.android";
export const PLAY_MANAGED_IMAGE_TYPES = [
  "phoneScreenshots",
  "featureGraphic",
] as const;
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_ROOT = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/edits`;

export interface PlayListing {
  language: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  video?: string;
}

interface PlayImage {
  id: string;
  url: string;
  sha1?: string;
  sha256?: string;
}

export interface PlayBaseline {
  packageName: string;
  capturedAt: string;
  listings: Array<PlayListing & { images: Record<string, PlayImage[]> }>;
}

// Never propagate response bodies or underlying fetch errors: OAuth errors can
// echo assertions and request diagnostics can contain Authorization headers.
async function requestJson<T>(
  url: string,
  options: RequestInit,
  request: typeof fetch,
): Promise<T> {
  let response: Response;
  try {
    response = await request(url, {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new Error("Google Play request failed (network or timeout).");
  }
  if (!response.ok) {
    throw new Error(`Google Play request failed (HTTP ${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Google Play returned an invalid JSON response.");
  }
}

export async function createPlayClient(
  credentialPath: string,
  request: typeof fetch = fetch,
) {
  let assertion: string;
  try {
    const credential = JSON.parse(readFileSync(credentialPath, "utf8"));
    if (
      credential.type !== "service_account" ||
      typeof credential.client_email !== "string" ||
      typeof credential.private_key !== "string"
    ) {
      throw new Error();
    }
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
      iss: credential.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })}`;
    const signature = createSign("RSA-SHA256")
      .update(unsigned)
      .sign(credential.private_key, "base64url");
    assertion = `${unsigned}.${signature}`;
  } catch {
    throw new Error("Cannot read a valid Google Play service-account key.");
  }
  const token = await requestJson<{ access_token: string }>(
    TOKEN_URL,
    {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    },
    request,
  );
  if (typeof token.access_token !== "string" || !token.access_token) {
    throw new Error("Google Play authentication returned no access token.");
  }
  return {
    async upload(suffix: string, png: Buffer): Promise<void> {
      await requestJson(
        `${API_ROOT.replace("/androidpublisher/v3/", "/upload/androidpublisher/v3/")}${suffix}?uploadType=media`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            "Content-Type": "image/png",
          },
          body: new Uint8Array(png),
        },
        request,
      );
    },
    async json<T>(suffix: string, method = "GET", body?: unknown): Promise<T> {
      return requestJson<T>(
        `${API_ROOT}${suffix}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            "Content-Type": "application/json",
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
        request,
      );
    },
  };
}

export async function pullPlayBaseline(
  client: Awaited<ReturnType<typeof createPlayClient>>,
): Promise<PlayBaseline> {
  const edit = await client.json<{ id: string }>("", "POST", {});
  if (!edit.id || !/^[a-zA-Z0-9_-]+$/.test(edit.id)) {
    throw new Error("Google Play returned an invalid edit ID.");
  }
  const editPath = `/${edit.id}`;
  try {
    return await readPlayBaseline(client, editPath);
  } finally {
    // A baseline never commits an edit or changes a listing.
    await client.json(editPath, "DELETE");
  }
}

export async function readPlayBaseline(
  client: Awaited<ReturnType<typeof createPlayClient>>,
  editPath: string,
): Promise<PlayBaseline> {
  const response = await client.json<{ listings?: PlayListing[] }>(
    `${editPath}/listings`,
  );
  const listings: PlayBaseline["listings"] = [];
  for (const listing of response.listings ?? []) {
    const images: Record<string, PlayImage[]> = {};
    for (const imageType of [
      "phoneScreenshots",
      "sevenInchScreenshots",
      "tenInchScreenshots",
      "tvScreenshots",
      "wearScreenshots",
      "icon",
      "featureGraphic",
      "tvBanner",
    ]) {
      const result = await client.json<{ images?: PlayImage[] }>(
        `${editPath}/listings/${encodeURIComponent(listing.language)}/${imageType}`,
      );
      images[imageType] = (result.images ?? []).map((image) => ({
        id: image.id,
        url: image.url,
        ...(image.sha1 ? { sha1: image.sha1 } : {}),
        ...(image.sha256 ? { sha256: image.sha256 } : {}),
      }));
    }
    // Store only public listing fields, never entire API responses.
    listings.push({
      language: listing.language,
      title: listing.title,
      shortDescription: listing.shortDescription,
      fullDescription: listing.fullDescription,
      ...(listing.video ? { video: listing.video } : {}),
      images,
    });
  }
  return {
    packageName: PACKAGE_NAME,
    capturedAt: new Date().toISOString(),
    listings: listings.sort((a, b) => a.language.localeCompare(b.language)),
  };
}

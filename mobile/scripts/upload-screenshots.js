// Replace an App Store screenshot set with the PNGs in a directory.
//
//   SET_ID=<appScreenshotSet id> DIR=metadata/screenshots/en-US/APP_IPHONE_65 \
//     node scripts/upload-screenshots.js
//
// Find SET_ID with:
//   asc screenshots list --version-localization <id> | jq -r '.sets[] |
//     "\(.set.attributes.screenshotDisplayType) \(.set.id)"'
//
// Only works against a version in PREPARE_FOR_SUBMISSION — a live version rejects
// uploads with "An attribute value is not acceptable for the current resource state".
//
// Apple's flow per asset: reserve -> PUT byte ranges -> commit with MD5 -> then pin order.
// Files upload in filename order, which is the order Apple displays them.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const SET_ID = process.env.SET_ID;
const DIR = process.env.DIR;
const API = "https://api.appstoreconnect.apple.com/v1";

const token = execSync("asc auth token --confirm", { encoding: "utf8" }).trim();
const auth = { Authorization: `Bearer ${token}` };

async function api(method, url, body) {
  const res = await fetch(url.startsWith("http") ? url : `${API}${url}`, {
    method,
    headers: { ...auth, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail = json?.errors?.[0];
    throw new Error(
      `${method} ${url} -> ${res.status}: ${detail?.title || ""} ${detail?.detail || text.slice(0, 200)}`,
    );
  }
  return json;
}

(async () => {
  // 1. Clear the stale 2020 assets out of the set.
  const existing = await api(
    "GET",
    `/appScreenshotSets/${SET_ID}/appScreenshots`,
  );
  console.log(`removing ${existing.data.length} existing screenshots from set`);
  for (const s of existing.data) {
    await api("DELETE", `/appScreenshots/${s.id}`);
    process.stdout.write(".");
  }
  console.log("");

  // 2. Upload the new ones, in filename order (which is display order).
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".png"))
    .sort();
  const ids = [];
  for (const name of files) {
    const abs = path.join(DIR, name);
    const buf = fs.readFileSync(abs);

    const reserved = await api("POST", "/appScreenshots", {
      data: {
        type: "appScreenshots",
        attributes: { fileName: name, fileSize: buf.length },
        relationships: {
          appScreenshotSet: { data: { type: "appScreenshotSets", id: SET_ID } },
        },
      },
    });
    const id = reserved.data.id;
    const ops = reserved.data.attributes.uploadOperations || [];

    for (const op of ops) {
      const headers = {};
      for (const h of op.requestHeaders || []) headers[h.name] = h.value;
      const slice = buf.subarray(op.offset, op.offset + op.length);
      const put = await fetch(op.url, {
        method: op.method,
        headers,
        body: slice,
      });
      if (!put.ok) throw new Error(`upload ${name} chunk -> ${put.status}`);
    }

    await api("PATCH", `/appScreenshots/${id}`, {
      data: {
        type: "appScreenshots",
        id,
        attributes: {
          uploaded: true,
          sourceFileChecksum: crypto
            .createHash("md5")
            .update(buf)
            .digest("hex"),
        },
      },
    });
    ids.push(id);
    console.log(
      `uploaded ${name} (${(buf.length / 1024).toFixed(0)} KB) -> ${id}`,
    );
  }

  // 3. Pin display order explicitly rather than relying on creation order.
  await api(
    "PATCH",
    `/appScreenshotSets/${SET_ID}/relationships/appScreenshots`,
    {
      data: ids.map((id) => ({ type: "appScreenshots", id })),
    },
  );
  console.log(`\nset order pinned: ${ids.length} screenshots`);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});

#!/usr/bin/env node
// Credentials stay in this process; browser cookies are served once, in memory.
import http from "node:http";
import { randomBytes } from "node:crypto";
import { parseArgs, parseEnv } from "node:util";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

try {
  const { values } = parseArgs({
    options: {
      "env-file": { type: "string" },
      "server-url": { type: "string", default: "https://beancount.io/" },
      "type-field": { type: "string" },
    },
  });
  if (values["env-file"]) {
    try {
      const credentials = parseEnv(readFileSync(values["env-file"], "utf8"));
      // An explicit package file wins over an ambient account and must be complete.
      process.env.QA_EMAIL = credentials.QA_EMAIL || "";
      process.env.QA_PASSWORD = credentials.QA_PASSWORD || "";
    } catch {
      fail(
        "Cannot load QA environment file; check its path and permissions.",
        2,
      );
    }
  }
  if (!process.env.QA_EMAIL || !process.env.QA_PASSWORD) {
    fail("Set QA_EMAIL and QA_PASSWORD in the environment or --env-file.", 2);
  }

  if (values["type-field"]) {
    const field = values["type-field"];
    if (field !== "email" && field !== "password")
      fail("--type-field must be email or password.", 2);
    // Caller first focuses and verifies the native browser's intended field.
    // Values travel through the child environment, never argv or script text.
    const variable = field === "email" ? "QA_EMAIL" : "QA_PASSWORD";
    const result = spawnSync("osascript", ["-"], {
      input: `tell application "Simulator" to activate\ntell application "System Events" to keystroke (system attribute "${variable}")\n`,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 15000,
    });
    if (result.status !== 0)
      fail(
        "Native typing failed; check Simulator focus and Accessibility access.",
      );
    console.log(`Typed QA ${field}.`);
    process.exit(0);
  }

  const base = new URL(values["server-url"]);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(base.hostname);
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    (base.protocol !== "https:" && !(base.protocol === "http:" && loopback))
  ) {
    fail("Use an HTTPS server URL, or HTTP loopback for local QA.", 2);
  }
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  const response = await fetch(new URL("api-gateway/", base), {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operationName: "SignIn",
      query:
        "mutation SignIn($email: String!, $password: String!) { signIn(email: $email, password: $password) { token expireAt } }",
      variables: {
        email: process.env.QA_EMAIL,
        password: process.env.QA_PASSWORD,
      },
    }),
  });
  if (!response.ok) fail(`QA sign-in failed (HTTP ${response.status}).`);
  const body = await response.json();
  if (body.errors?.length || !body.data?.signIn?.token)
    fail(
      "QA sign-in rejected or returned no session; verify credentials locally.",
    );
  const raw = response.headers
    .getSetCookie()
    .find((value) => value.startsWith("authSess:beancount.io="));
  if (!raw)
    fail(
      "QA sign-in returned no browser session cookie; inspect the current auth contract.",
    );
  const [pair, ...attributes] = raw.split(";");
  const split = pair.indexOf("=");
  const attrs = Object.fromEntries(
    attributes.map((value) => {
      const [key, ...parts] = value.trim().split("=");
      return [key.toLowerCase(), parts.join("=")];
    }),
  );
  const cookie = {
    name: pair.slice(0, split),
    value: pair.slice(split + 1),
    domain: attrs.domain || base.hostname,
    path: attrs.path || "/",
    httpOnly: "httponly" in attrs,
    secure: "secure" in attrs,
    sameSite:
      { strict: "Strict", lax: "Lax", none: "None" }[
        attrs.samesite?.toLowerCase()
      ] || "Lax",
  };
  const expiry = Date.parse(body.data.signIn.expireAt);
  if (Number.isFinite(expiry)) cookie.expires = expiry / 1000;
  let state = JSON.stringify({ cookies: [cookie] });
  const path = `/${randomBytes(24).toString("hex")}.json`;
  const server = http.createServer((request, reply) => {
    if (request.method !== "GET" || request.url !== path || !state) {
      reply.writeHead(404).end();
      return;
    }
    const payload = state;
    state = "";
    reply.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    reply.end(payload, () => server.close());
  });
  server.on("close", () => clearTimeout(timer));
  const timer = setTimeout(() => {
    state = "";
    server.closeAllConnections();
    server.close();
  }, 60000);
  server.listen(0, "127.0.0.1", () => {
    console.log(`ok http://127.0.0.1:${server.address().port}${path}`);
  });
} catch {
  // Upstream errors can echo submitted credentials; never print the exception.
  fail("QA helper failed; check server availability and helper arguments.");
}
